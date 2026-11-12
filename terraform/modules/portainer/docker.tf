resource "random_pet" "tag" {
  length = 1
}


resource "docker_image" "botrucho" {
  name = "${var.image_repository}:${random_pet.tag.id}"
  build {
    context    = abspath("${path.module}/../../..")
    dockerfile = "docker/Dockerfile"
  }
}

resource "docker_registry_image" "push_image" {
  name = docker_image.botrucho.name
}
