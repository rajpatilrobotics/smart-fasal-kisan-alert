locals {
  name_prefix = "smart-fasal-${var.environment}"
  labels = {
    application = "smart-fasal"
    environment = var.environment
    managed_by  = "terraform"
  }
}
