module "platform_baseline" {
  source = "../../modules/platform-baseline"

  environment    = "production"
  gcp_project_id = var.gcp_project_id
  region         = var.region
}
