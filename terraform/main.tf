terraform {
  required_version = ">= 1.7.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "8.11.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = "us-east1"
  zone    = "us-east1-b"
}

# Only GCP is active. The Portainer alternative is preserved under modules/,
# with no module block/provider configuration here and no Docker side effects.
module "gcp" {
  source            = "./modules/gcp"
  project_id        = var.project_id
  instance_name     = var.instance_name
  ssh_public_key    = var.ssh_public_key
  ssh_source_ranges = var.ssh_source_ranges
}
