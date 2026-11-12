terraform {
  required_version = ">= 1.7.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 8.11.0, < 9.0.0"
    }
  }
}

resource "google_compute_instance" "bot" {
  project      = var.project_id
  name         = var.instance_name
  zone         = "us-east1-b"
  machine_type = "e2-micro"
  tags         = ["discord-bot"]
  labels       = { managed-by = "terraform", application = "discord-bot" }

  boot_disk {
    auto_delete = true
    initialize_params {
      image = "debian-cloud/debian-13"
      size  = 20
      type  = "pd-standard"
    }
  }

  network_interface {
    network = "default"
    access_config {
      network_tier = "STANDARD"
    }
  }

  metadata = {
    ssh-keys               = "botuser:${trimspace(var.ssh_public_key)}"
    block-project-ssh-keys = "TRUE"
    enable-oslogin         = "FALSE"
    startup-script         = templatefile("${path.module}/startup.sh.tftpl", {})
  }

  scheduling {
    preemptible         = false
    automatic_restart   = true
    on_host_maintenance = "MIGRATE"
    provisioning_model  = "STANDARD"
  }

  lifecycle {
    prevent_destroy = true
    # Keep the existing boot image when importing; image-family updates must
    # not cause replacement of an already provisioned VM.
    ignore_changes = [boot_disk[0].initialize_params[0].image]
  }
}

resource "google_compute_firewall" "ssh" {
  project       = var.project_id
  name          = "${var.instance_name}-ssh"
  network       = "default"
  direction     = "INGRESS"
  source_ranges = var.ssh_source_ranges
  target_tags   = ["discord-bot"]
  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
}
