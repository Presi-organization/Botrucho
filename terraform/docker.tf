resource "docker_image" "botrucho" {
  name = "jonathanstrf/botrucho:1.1.3"
}

resource "docker_container" "botrucho" {
  image = docker_image.botrucho.image_id
  name  = "botrucho"
  ports {
    internal = 3000
    external = 3000
  }
  env = [
    "DOTENV_KEY=${var.dotenv}"
  ]
  restart = "unless-stopped"
  init    = true
}
