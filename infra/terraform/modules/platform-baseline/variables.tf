variable "environment" {
  description = "Deployment environment name."
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "environment must be dev, staging, or production."
  }
}

variable "gcp_project_id" {
  description = "Google Cloud project ID supplied by the environment or CI."
  type        = string
  nullable    = false

  validation {
    condition     = length(trimspace(var.gcp_project_id)) >= 6
    error_message = "gcp_project_id must be a non-empty Google Cloud project ID."
  }
}

variable "region" {
  description = "Primary Google Cloud region."
  type        = string
  default     = "asia-south1"
}
