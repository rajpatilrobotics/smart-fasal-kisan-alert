# Terraform foundation

This directory establishes reviewable environment boundaries for Google Cloud without provisioning production resources in Milestone 0.

- `modules/platform-baseline` owns shared naming and validation.
- `environments/dev`, `staging`, and `production` are isolated roots.
- Remote-state backend configuration is supplied during CI initialization and is never committed with credentials.
- Future resources must use Workload Identity Federation and Secret Manager; service-account key JSON is prohibited.

Validate an environment with `terraform -chdir=environments/dev init -backend=false` followed by `terraform -chdir=environments/dev validate`.
