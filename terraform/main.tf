# --- I. PROVIDER, VARIABLES, AND INITIAL SETUP ---

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

variable "project_id" {}
variable "region" {}
variable "container_image" {}
variable "allowed_web_domains" {}
variable "allowed_iap_users" {}
variable "oauth2_client_id" {}
variable "oauth2_client_secret" {}
variable "github_owner" {}
variable "github_repo_name" {}


provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}


# Data source to fetch the default service account (for Cloud Run runtime)
data "google_compute_default_service_account" "default" {
  project = var.project_id
}

# Data source to fetch project number (for Cloud Build SA)
data "google_project" "project" {}

# Local variable for easier reference to Cloud Build SA
locals {
  cloudbuild_sa = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
  cloudbuild_sa_id = "projects/${var.project_id}/serviceAccounts/${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}

# --- II. API ACTIVATION ---

# Enables all necessary APIs for the project components
resource "google_project_service" "required_apis" {
  for_each = toset([
    "compute.googleapis.com", 
    "serviceusage.googleapis.com", 
    "sqladmin.googleapis.com",           
    "servicenetworking.googleapis.com",   
    "run.googleapis.com",                 
    "vpcaccess.googleapis.com",           
    "storage.googleapis.com",             
    "apikeys.googleapis.com",             
    "maps-backend.googleapis.com",        
    "cloudbuild.googleapis.com",
    "iap.googleapis.com",
    "iam.googleapis.com",
    "certificatemanager.googleapis.com"
  ])

  project                    = var.project_id
  service                    = each.key
  disable_on_destroy         = false
  disable_dependent_services = false
}

# --- III. NETWORKING & CLOUD SQL (Private DB) ---

# 1. Reserve IP Range for Private Services Connection
resource "google_compute_global_address" "private_service_range" {
  name          = "google-services-private-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16 
  network       = "projects/${var.project_id}/global/networks/default"
  depends_on = [google_project_service.required_apis]
}

# 2. Establish Private Service Connection (VPC Peering)
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = "projects/${var.project_id}/global/networks/default"
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_range.name]
  depends_on = [google_compute_global_address.private_service_range]
}

# 3. Cloud SQL Instance (PostgreSQL)
resource "google_sql_database_instance" "postgres_instance" {
  database_version = "POSTGRES_15"
  name             = "app-postgres-instance"
  region           = var.region
  settings {
    tier = "db-f1-micro"
    ip_configuration {
      ipv4_enabled    = false # Use Private IP only
      private_network = "projects/${var.project_id}/global/networks/default"
    }
    disk_size = 20
  }
  depends_on = [
    google_service_networking_connection.private_vpc_connection,
    google_project_service.required_apis
  ]
}

resource "google_sql_database" "app_db" {
  instance = google_sql_database_instance.postgres_instance.name
  name     = "appdb"
}

# 4. Serverless VPC Access Connector (Cloud Run to VPC)
resource "google_vpc_access_connector" "connector" {
  name          = "cloud-run-vpc-connector"
  region        = var.region
  network       = "default" 
  ip_cidr_range = "10.8.0.0/28"
  depends_on = [google_project_service.required_apis]
}

# --- IV. SECRET MANAGER & IAM ROLES ---

resource "google_secret_manager_secret" "db_password_secret" {
  secret_id = "db-password"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password_version" {
  secret = google_secret_manager_secret.db_password_secret.id
  secret_data = "your_secure_db_password" 
}

# IAM: Grant Cloud Run SA access to read the secret
resource "google_secret_manager_secret_iam_member" "db_password_accessor" {
  secret_id = google_secret_manager_secret.db_password_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_compute_default_service_account.default.email}"
}

# IAM: Grant Cloud Build SA permissions
resource "google_project_iam_member" "cloudbuild_sa_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = local.cloudbuild_sa
  depends_on = [google_project_service.required_apis]
}

# --- V. CLOUD RUN V2 (IAP Enabled) ---

resource "google_cloud_run_v2_service" "app_service" {
  name     = "diner-ff-service"
  location = var.region

  template {
    # NO public access annotation here, as IAP handles auth
    volumes {
      name = "db-password-volume" # A name for the secret volume
      secret {
        secret     = google_secret_manager_secret.db_password_secret.secret_id
        default_mode = 288 # Optional: Sets file permissions (e.g., 0440)
        # Items are optional; 'version' here is not used.
      }
    }
    containers {
      image = var.container_image
      env {
        name  = "DATABASE_HOST"
        value = google_sql_database_instance.postgres_instance.private_ip_address
      }
    }
    
    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "ALL_TRAFFIC"
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
  depends_on = [
    google_vpc_access_connector.connector,
    google_secret_manager_secret_iam_member.db_password_accessor,
  ]
}

# Data source to fetch the Cloud Run service details for the NEG
data "google_cloud_run_v2_service" "app_service_data" {
  location = google_cloud_run_v2_service.app_service.location
  name     = google_cloud_run_v2_service.app_service.name
  depends_on = [google_cloud_run_v2_service.app_service]
}


# --- VI. IAP CONFIGURATION (Requires Load Balancer) ---

# A. Serverless Network Endpoint Group (NEG)
resource "google_compute_region_network_endpoint_group" "serverless_neg" {
  name                  = "iap-cloudrun-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  cloud_run {
    service = google_cloud_run_v2_service.app_service.name
  }
  depends_on = [google_cloud_run_v2_service.app_service]
}

# B. Backend Service (IAP Enabled)
resource "google_compute_backend_service" "iap_backend" {
  name        = "iap-backend-service"
  protocol    = "HTTPS" 
  timeout_sec = 30
  iap {
    oauth2_client_id     = var.oauth2_client_id
    oauth2_client_secret = var.oauth2_client_secret
  }

  backend {
    group = google_compute_region_network_endpoint_group.serverless_neg.id
  }
}

resource "google_project_iam_member" "iap_access_project" {
  for_each = toset(var.allowed_iap_users)
  project = var.project_id
  role    = "roles/iap.httpsResourceAccessor"
  member  = each.value
}


resource "google_cloud_run_service_iam_binding" "binding" {
  location = google_cloud_run_v2_service.app_service.location
  service  = google_cloud_run_v2_service.app_service.name
  role = "roles/run.invoker"
  members = [
    "serviceAccount:service-${data.google_project.project.number}@gcp-sa-iap.iam.gserviceaccount.com",
  ]
}

# Google-Managed Certificate (using Load Balancer Authorization)
resource "google_certificate_manager_certificate" "diner_cert" {
#  provider = google-beta
  name     = "diner-xtended-cert"
  scope    = "DEFAULT" 
  
  managed {
    domains = [
      "diner.xtended.uk",
      "static.diner.xtended.uk",
      "www.diner.xtended.uk",
    ]
  }
}
resource "google_certificate_manager_certificate_map" "cert_map" {
#  provider = google-beta
  name     = "diner-xtended-map"
} 

resource "google_certificate_manager_certificate_map_entry" "diner_entry" {
  name     = "diner-xtended-entry"
  map      = google_certificate_manager_certificate_map.cert_map.name
  certificates = [
    google_certificate_manager_certificate.diner_cert.id
  ]
  hostname = "diner.xtended.uk" 
  depends_on = [
    google_certificate_manager_certificate.diner_cert,
    google_certificate_manager_certificate_map.cert_map
]
}
resource "google_certificate_manager_certificate_map_entry" "static_entry" {
  name     = "static-diner-xtended-entry"
  map      = google_certificate_manager_certificate_map.cert_map.name
  certificates = [
    google_certificate_manager_certificate.diner_cert.id
  ]
  hostname = "static.diner.xtended.uk"
  depends_on = [
    google_certificate_manager_certificate.diner_cert,
    google_certificate_manager_certificate_map.cert_map
]
} 
resource "google_certificate_manager_certificate_map_entry" "www_entry" {
  name     = "www-diner-xtended-entry"
  map      = google_certificate_manager_certificate_map.cert_map.name
  certificates = [
    google_certificate_manager_certificate.diner_cert.id
  ]
  hostname = "www.diner.xtended.uk"
  depends_on = [
    google_certificate_manager_certificate.diner_cert,
    google_certificate_manager_certificate_map.cert_map
]
} 



# --- VII. ARTIFACT REGISTRY & CLOUD BUILD CI/CD ---

# 1. Artifact Registry Repository
resource "google_artifact_registry_repository" "docker_repo" {
  provider      = google-beta
  location      = var.region
  repository_id = "cloud-run-repo"
  format        = "DOCKER"
  depends_on = [google_project_service.required_apis]
}


# 2. IAM: Grant Cloud Build permission to push images
resource "google_artifact_registry_repository_iam_member" "cloudbuild_writer" {
  repository = google_artifact_registry_repository.docker_repo.id
  role       = "roles/artifactregistry.writer"
  member     = local.cloudbuild_sa
}

# 3. IAM: Grant Cloud Build permission to deploy to Cloud Run
resource "google_cloud_run_v2_service_iam_member" "cloudbuild_deployer" {
  location = google_cloud_run_v2_service.app_service.location
  name     = google_cloud_run_v2_service.app_service.name
  role     = "roles/run.admin"
  member   = local.cloudbuild_sa
}

# 4. Cloud Build Trigger
resource "google_cloudbuild_trigger" "app_build_trigger" {
  provider = google-beta
  name     = "build-and-deploy-app"
  service_account = local.cloudbuild_sa_id

  github {
    owner = var.github_owner
    name  = var.github_repo_name
    push {
      branch = "main"
    }
  }

  filename = "cloudbuild.yaml" 
  
  substitutions = {
#    _IMAGE_NAME = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/app:gcr.$SHORT_SHA"
    _IMAGE_NAME = "crccheck/hello-world"
    _REGION     = var.region
  }
  depends_on = [google_cloud_run_v2_service.app_service]
}


# --- VIII. CLOUD STORAGE & CLOUD CDN ---

# 1. Cloud Storage Bucket (Static Assets)
resource "google_storage_bucket" "static_assets_bucket" {
  name          = "${var.project_id}-static-assets" 
  location      = "US" 
  uniform_bucket_level_access = true
  force_destroy = true 
}

# 2. Backend Bucket (Connects GCS to the Load Balancer)
resource "google_compute_backend_bucket" "cdn_backend" {
  name        = "cdn-backend-bucket"
  bucket_name = google_storage_bucket.static_assets_bucket.name
  enable_cdn  = true
}

resource "google_storage_bucket_iam_member" "static_bucket_public_read" {
  bucket = google_storage_bucket.static_assets_bucket.name 
  role   = "roles/storage.objectViewer" # <-- If using project-level policy
  member = "allUsers"
}

# 3. GLOBAL EXTERNAL IP ADDRESS (Shared by CDN and IAP/App)
resource "google_compute_global_address" "static_ip" {
  name = "global-static-ip"
}

# 4. URL MAP (Routes traffic to IAP Backend or CDN Backend based on path/host)
resource "google_compute_url_map" "main_url_map" {
  name = "main-url-map"
  
  # Default service points to the IAP-enabled Cloud Run application
  default_service = google_compute_backend_service.iap_backend.self_link 

  host_rule {
    # Match the specific domain for your Cloud Run app
    hosts = ["diner.xtended.uk", "www.diner.xtended.uk"] 
    # Use the default path matcher, which points to the default_service (iap_backend)
    path_matcher = "default-app-matcher" 
  }

  # Host rule to route static assets to the CDN backend
  host_rule {
    hosts = ["static.diner.xtended.uk"] # Change to your CDN domain
    path_matcher = "cdn-matcher"
  }

  # Path matcher for the main application (points to the default_service)
  path_matcher {
    name = "default-app-matcher"
    default_service = google_compute_backend_service.iap_backend.self_link
  }
  # Path matcher for the CDN assets
  path_matcher {
    name = "cdn-matcher"
    default_service = google_compute_backend_bucket.cdn_backend.self_link
  }
}

# 5. TARGET HTTP PROXY 
resource "google_compute_target_https_proxy" "https_proxy" {
  name = "main-https-proxy"
  url_map = google_compute_url_map.main_url_map.self_link
  certificate_map = "//certificatemanager.googleapis.com/${google_certificate_manager_certificate_map.cert_map.id}"
  depends_on = [
    google_certificate_manager_certificate_map.cert_map
  ]
}

# HTTP Target Proxy (Points to the redirect map)
resource "google_compute_target_http_proxy" "http_proxy" {
  name    = "main-http-proxy"
  url_map = google_compute_url_map.http_redirect_map.self_link
}

# 5. Global Forwarding Rule for HTTPS (Port 443)
resource "google_compute_global_forwarding_rule" "https_forwarding_rule" {
  name                  = "main-https-forwarding-rule"
  ip_protocol           = "TCP"
  port_range            = "443"
  ip_address            = google_compute_global_address.static_ip.address 
  target                = google_compute_target_https_proxy.https_proxy.self_link
  load_balancing_scheme = "EXTERNAL"
}
# Global Forwarding Rule for HTTP (Port 80)
resource "google_compute_global_forwarding_rule" "http_forwarding_rule" {
  name                  = "main-http-forwarding-rule"
  ip_protocol           = "TCP"
  port_range            = "80"
  ip_address            = google_compute_global_address.static_ip.address
  target                = google_compute_target_http_proxy.http_proxy.self_link
  load_balancing_scheme = "EXTERNAL"
}

# HTTP Redirect URL Map
resource "google_compute_url_map" "http_redirect_map" {
  name        = "http-redirect-map"
  default_url_redirect {
    https_redirect         = true
    strip_query            = false
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT" # 301 Redirect
  }
}

# --- IX. GOOGLE MAPS API KEY ---

resource "google_apikeys_key" "maps_api_key" {
  name         = "diner-ff--maps-key"
  display_name = "diner FF Maps Key (Web Restricted)"

  restrictions {
    api_targets {
      service = "maps-backend.googleapis.com"
    }

    browser_key_restrictions {
      allowed_referrers = var.allowed_web_domains
    }
  }
  depends_on = [ google_project_service.required_apis ]
}


# --- X. OUTPUTS ---

output "load_balancer_ip" {
  description = "The public static IP address for the Load Balancer (CDN/IAP Endpoint)"
  value       = google_compute_global_address.static_ip.address
}

output "db_connection_name" {
  description = "The full connection name for Cloud SQL"
  value       = google_sql_database_instance.postgres_instance.connection_name
}

output "maps_key_string" {
  description = "The actual API Key string (Sensitive)"
  value       = google_apikeys_key.maps_api_key.key_string
  sensitive   = true
}
