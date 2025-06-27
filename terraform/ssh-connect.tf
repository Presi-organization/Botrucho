resource "null_resource" "deploy_botrucho" {
  depends_on = [docker_registry_image.push_image]

  connection {
    type        = "ssh"
    user        = var.ssh_user
    private_key = file(var.ssh_private_key_path)
    host        = var.ssh_host
    port        = var.ssh_port
  }

  provisioner "remote-exec" {
    inline = [
      "docker pull ${docker_registry_image.push_image.name}",
      "if docker ps -a --filter \"name=botrucho\" --format '{{.Names}}' | grep -q \"^botrucho$\"; then docker rm -f botrucho; fi",
      "docker run -e DOTENV_PRIVATE_KEY_PRODUCTION=${var.dotenv} --name botrucho -p 3000:3000 -d --restart on-failure:5 --init ${docker_registry_image.push_image.name}"
    ]
  }
}


resource "null_resource" "destroy_command" {

  triggers = {
    ssh_private_key_path = var.ssh_private_key_path
    ssh_port             = var.ssh_port
    ssh_user             = var.ssh_user
    ssh_host             = var.ssh_host
    docker_name          = docker_registry_image.push_image.name
  }

  provisioner "local-exec" {
    when    = destroy
    command = "ssh -i ${self.triggers.ssh_private_key_path} -p ${self.triggers.ssh_port} ${self.triggers.ssh_user}@${self.triggers.ssh_host} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o IdentitiesOnly=yes 'docker rm -f botrucho && docker rmi ${self.triggers.docker_name}'"
  }
}
