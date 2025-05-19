resource "docker_image" "botrucho" {
  name = "botrucho:1.1.4"
}

resource "null_resource" "deploy_botrucho" {
  provisioner "local-exec" {
    command = <<EOT
      echo "${var.ssh_private_key}" > /tmp/ssh_key && \
      chmod 600 /tmp/ssh_key && \
      docker save botrucho:1.1.4 | \
      ssh -T -i /tmp/ssh_key -p ${var.ssh_port} -o StrictHostKeyChecking=no ${var.ssh_user}@${var.ssh_host} '
        docker load && \
        docker rm -f botrucho || true && \
        docker run -e DOTENV_KEY=${var.dotenv} --name botrucho -p 3000:3000 -d --restart unless-stopped --init botrucho:1.1.4
      '
    EOT
  }
}

# resource "docker_container" "botrucho" {
#   image = docker_image.botrucho.image_id
#   name  = "botrucho"
#   ports {
#     internal = 3000
#     external = 3000
#   }
#   env = [
#     "DOTENV_KEY=${var.dotenv}"
#   ]
#   restart = "unless-stopped"
#   init    = true
# }
