# Resource Details
variable "cluster_name" {
  description = "Name of the new AKS cluster."
  type        = string
}

variable "location" {
  description = "The Azure region where resources will be deployed (UK South)."
  type        = string
}

variable "resource_group_name" {
  description = "Name of the existing Resource Group (Laci)."
  type        = string
}

variable "existing_network_rg_name" {
  description = "The name of the Resource Group where the VNet and Subnet reside (PRD-Vnet)."
  type        = string
}

variable "existing_vnet_name" {
  description = "The name of the existing Virtual Network (PRD-UKS)."
  type        = string
}

variable "existing_subnet_name" {
  description = "The name of the existing Subnet (PRD-LINUX-APP-UKS)."
  type        = string
}

# AKS Node Pool Configuration
variable "node_count" {
  description = "Number of agent nodes in the default node pool."
  type        = number
  default     = 2
}

variable "vm_size" {
  description = "Size of the virtual machines in the node pool."
  type        = string
  default     = "Standard_A2_v2"
}
