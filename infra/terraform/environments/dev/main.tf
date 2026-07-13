module "platform_baseline" {
  source = "../../modules/platform-baseline"

  environment    = "dev"
  gcp_project_id = var.gcp_project_id
  region         = var.region
}
