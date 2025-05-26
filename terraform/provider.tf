terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "3.0.2"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
  required_version = ">= 1.1.7"
}

locals {
  docker_host = (terraform.workspace == "windows") ? "npipe:////./pipe/dockerDesktopLinuxEngine" : "unix:///var/run/docker.sock"
}

provider "docker" {
  host = local.docker_host

  registry_auth {
    address  = "registry-1.docker.io"
    username = "presi11"
    password = "${var.docker_token}" # token of dockerhub
  }
}
