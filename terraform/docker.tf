resource "docker_image" "botrucho" {
  name = "jonathanstrf/botrucho:1.1.4"
}

resource "null_resource" "deploy_botrucho" {
  provisioner "local-exec" {
    command = <<EOT
      docker save jonathanstrf/botrucho:1.1.4 | ssh -i ${var.ssh_private_key} ${var.ssh_user}@${var.ssh_host} "docker load && docker run -e DOTENV_KEY=${var.dotenv} --name botrucho -p 3000:3000 -d --restart unless-stopped --init jonathanstrf/botrucho:1.1.4"
    EOT
  }
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
