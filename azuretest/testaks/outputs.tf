output "resource_group_name" {
  description = "The name of the existing Azure Resource Group used."
  value       = data.azurerm_resource_group.existing_aks_rg.name
}

output "kubernetes_cluster_name" {
  description = "The name of the deployed AKS cluster."
  value       = azurerm_kubernetes_cluster.aks.name
}

output "kubernetes_cluster_fqdn" {
  description = "The FQDN used to access the Kubernetes API server."
  value       = azurerm_kubernetes_cluster.aks.fqdn
}

output "vnet_subnet_id" {
  description = "The Resource ID of the existing Subnet used for the AKS nodes."
  value       = data.azurerm_subnet.existing_subnet.id
}
