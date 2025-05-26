resource "random_pet" "tag" {
  length = 1
}


resource "docker_image" "botrucho" {
  name = "registry-1.docker.io/presi11/botrucho:${random_pet.tag.id}"
  build {
    context    = "${path.module}/.."
    dockerfile = "docker/Dockerfile"
  }
}

resource "docker_registry_image" "push_image" {
  name = docker_image.botrucho.name
}