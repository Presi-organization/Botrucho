terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "3.0.2"
    }
  }
  required_version = ">= 1.1.7"
}

locals {
  docker_host = (terraform.workspace == "windows") ? "npipe:////./pipe/dockerDesktopLinuxEngine" : "unix:///var/run/docker.sock"
}

provider "docker" {
  host = local.docker_host
}
