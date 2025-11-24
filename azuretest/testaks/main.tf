# main.tf

# Configure the Azure Provider
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      # Recommended to use the latest version for full feature support
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# Define local values for dynamic construction of the NRG name
locals {
  # The Node Resource Group (NRG) name follows the format: 
  # MC_<AKS_RG>_<CLUSTER_NAME>_<LOCATION_SIMPLIFIED>
  # Location must be lowercased and spaces removed (e.g., "uksouth" from "UK South").
  agic_nrg_name = "MC_${var.resource_group_name}_${var.cluster_name}_${lower(replace(var.location, " ", ""))}"
}


data "azurerm_resource_group" "nrg" {
  name = local.agic_nrg_name
}

# --- Data Sources for Existing Infrastructure ---
# 1. Reference the existing Resource Group for the AKS Cluster ("Laci")
data "azurerm_resource_group" "existing_aks_rg" {
  name = var.resource_group_name # Laci
}

# 2. Reference the existing Resource Group for the Network ("PRD-Vnet")
data "azurerm_resource_group" "existing_vnet_rg" {
  name = var.existing_network_rg_name # PRD-Vnet
}

# 3. Reference the existing Virtual Network ("PRD-UKS")
data "azurerm_virtual_network" "existing_vnet" {
  name                = var.existing_vnet_name
  # Use the Resource Group where the VNet lives
  resource_group_name = data.azurerm_resource_group.existing_vnet_rg.name 
}

# 4. Reference the existing Subnet ("PRD-LINUX-APP-UKS")
data "azurerm_subnet" "existing_subnet" {
  name                 = var.existing_subnet_name
  virtual_network_name = data.azurerm_virtual_network.existing_vnet.name
  # Use the Resource Group where the VNet lives
  resource_group_name  = data.azurerm_resource_group.existing_vnet_rg.name 
}

data "azurerm_user_assigned_identity" "agic_identity" {
  name                = "ingressapplicationgateway-${var.cluster_name}" 
  resource_group_name = local.agic_nrg_name
}

resource "azurerm_subnet" "app_gateway_subnet" {
  resource_group_name  = data.azurerm_resource_group.existing_vnet_rg.name 
  virtual_network_name = data.azurerm_virtual_network.existing_vnet.name
  name                 = "subnet-agic"
  address_prefixes     = ["10.200.254.0/24"] 
}


# resource "azurerm_log_analytics_workspace"
resource "azurerm_log_analytics_workspace" "aks_workspace" {
  # Name the workspace based on the cluster name for easy correlation
  name                = "${var.cluster_name}-workspace"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.existing_aks_rg.name # Place in Laci RG
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# --- AKS Cluster Resource: test1 ---

resource "azurerm_kubernetes_cluster" "aks" {
  # General Settings
  name                = var.cluster_name
  location            = var.location
  resource_group_name = data.azurerm_resource_group.existing_aks_rg.name
  dns_prefix          = "${var.cluster_name}-dns"
  # Using a recent, stable version (1.32.9 is generally not available yet)
  kubernetes_version  = "1.32.9" 

  # Identity and Access
  identity {
    type = "SystemAssigned"
  }
  local_account_disabled = false # Local accounts enabled

  # Security and RBAC
  role_based_access_control_enabled = true
  azure_policy_enabled              = true
  oidc_issuer_enabled               = true
  workload_identity_enabled         = true
  image_cleaner_enabled             = true

  # Auto Upgrade (Simplified to top-level field)
  automatic_channel_upgrade = "patch" 

  # Networking (Azure CNI Overlay)
  network_profile {
    network_plugin      = "azure"
    network_plugin_mode = "overlay" 
    load_balancer_sku   = "standard"
    network_policy      = "calico" # As requested
    
    service_cidr       = "10.20.0.0/16"
    dns_service_ip     = "10.20.0.10"
  }

  # Default Node Pool Configuration
  default_node_pool {
    name                 = "nodepool1"
    node_count           = var.node_count
    vm_size              = var.vm_size
    vnet_subnet_id       = data.azurerm_subnet.existing_subnet.id
#    os_disk_type         = "Ephemeral" 
    
    type                 = "VirtualMachineScaleSets" 
    upgrade_settings {
      drain_timeout_in_minutes      = 0
      max_surge                     = "10%"
      node_soak_duration_in_minutes = 0
    }
 
  }
  ingress_application_gateway {
    subnet_id = azurerm_subnet.app_gateway_subnet.id
  }

  # Monitoring Integration (Container Logs/Log Analytics)
  oms_agent {
    # Dynamically reference the ID from the new resource
    log_analytics_workspace_id = azurerm_log_analytics_workspace.aks_workspace.id
  }
  
  # Advanced Settings
  api_server_access_profile {
    authorized_ip_ranges = [] # Disabled
  }
}

resource "azurerm_role_assignment" "agic_network_contributor" {
  scope                = azurerm_subnet.app_gateway_subnet.id
  role_definition_name = "Network Contributor"
  principal_id         = data.azurerm_user_assigned_identity.agic_identity.principal_id
}
resource "azurerm_role_assignment" "agic_contributor_on_nrg" {
  # Scope is the Node Resource Group (where the Application Gateway resource lives)
  scope                = data.azurerm_resource_group.nrg.id
  role_definition_name = "Contributor"
  principal_id         = data.azurerm_user_assigned_identity.agic_identity.principal_id
}

