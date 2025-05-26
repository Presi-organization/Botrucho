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
      "sudo docker pull ${docker_registry_image.push_image.name}",
      "sudo docker run -e DOTENV_KEY=${var.dotenv} --name botrucho -p 3000:3000 -d --restart unless-stopped --init ${docker_registry_image.push_image.name}"
    ]
  }
}


resource "null_resource" "destroy_command" {

  triggers = {
    ssh_private_key_path = var.ssh_private_key_path
    ssh_port             = var.ssh_port
    ssh_user             = var.ssh_user
    ssh_host             = var.ssh_host
    docker_name = docker_registry_image.push_image.name
  }

  provisioner "local-exec" {
    when    = destroy
    command = "ssh -i ${self.triggers.ssh_private_key_path} -p ${self.triggers.ssh_port} ${self.triggers.ssh_user}@${self.triggers.ssh_host} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o IdentitiesOnly=yes 'sudo docker rm -f botrucho && sudo docker rmi ${self.triggers.docker_name}'"
  }
}
