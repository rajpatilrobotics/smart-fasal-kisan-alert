output "gcp_project_id" {
  description = "Validated Google Cloud project ID."
  value       = var.gcp_project_id
}

output "labels" {
  description = "Required labels for future resources."
  value       = local.labels
}

output "name_prefix" {
  description = "Stable resource naming prefix."
  value       = local.name_prefix
}

output "region" {
  description = "Validated primary region."
  value       = var.region
}
