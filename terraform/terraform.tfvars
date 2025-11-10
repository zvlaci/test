# CORE PROJECT CONFIGURATION
project_id        = "diner-ff"
region            = "europe-west2"

# APPLICATION AND IMAGE
container_image   = "crccheck/hello-world"
#container_image   = "europe-west2-docker.pkg.dev/diner-ff/cloud-run-repo/app:initial"

# GOOGLE MAPS API KEY RESTRICTIONS
allowed_web_domains = [
  "*",
  "*.diner.xtended.uk/*",
  "diner.xtended.uk/*",
]

# IAP CONFIGURATION
allowed_iap_users = [
  "user:zzlaci@gmail.com",
  "user:darren@justapplications.co.uk",
  "user:adrian@justapplications.co.uk",
  "user:adrian.kaiax@gmail.com",
#  "group:developers@diner.xtended.uk",
]
oauth2_client_id     = "531383122201-joag1h8rlespsphdhip7ntt8f6mhuo7t.apps.googleusercontent.com"
oauth2_client_secret = "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"

# CLOUD BUILD TRIGGER CONFIGURATION
github_owner      = "zvlaci"
github_repo_name  = "test"
