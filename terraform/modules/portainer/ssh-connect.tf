resource "null_resource" "deploy_botrucho" {
  depends_on = [docker_registry_image.push_image]

  triggers = {
    image_id    = docker_image.botrucho.image_id
    memory_mb   = var.memory_mb
    cpu_limit   = var.cpu_limit
    bind        = var.bind_address
    environment = sha256(var.dotenv)
    env_path    = var.runtime_env_path
    shards      = var.shards
  }

  connection {
    type        = "ssh"
    user        = var.ssh_user
    private_key = file(var.ssh_private_key_path)
    host        = var.ssh_host
    port        = var.ssh_port
  }

  # Create restrictive permissions BEFORE uploading any plaintext secret.
  provisioner "remote-exec" {
    inline = [
      "umask 077; mkdir -p '${dirname(var.runtime_env_path)}'; chmod 700 '${dirname(var.runtime_env_path)}'; touch '${var.runtime_env_path}'; chmod 600 '${var.runtime_env_path}'"
    ]
  }

  provisioner "file" {
    content     = "DOTENV_PRIVATE_KEY_PRODUCTION=${var.dotenv}\n"
    destination = var.runtime_env_path
  }

  provisioner "remote-exec" {
    inline = [
      "set -eu",
      "docker pull ${docker_registry_image.push_image.name}",
      "if docker ps -a --filter \"name=botrucho\" --format '{{.Names}}' | grep -q \"^botrucho$\"; then docker stop --time 15 botrucho; docker rm botrucho; fi",
      "docker run --env-file '${var.runtime_env_path}' -e SHARDS=${var.shards} --name botrucho -p ${var.bind_address}:3000:3000 --memory=${var.memory_mb}m --memory-swap=${var.memory_mb}m --cpus=${var.cpu_limit} --log-opt max-size=10m --log-opt max-file=3 --stop-timeout 15 -d --restart unless-stopped --init ${docker_registry_image.push_image.name}"
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
    command = "ssh -i ${self.triggers.ssh_private_key_path} -p ${self.triggers.ssh_port} ${self.triggers.ssh_user}@${self.triggers.ssh_host} -o StrictHostKeyChecking=yes -o IdentitiesOnly=yes 'docker stop --time 15 botrucho && docker rm botrucho && docker rmi ${self.triggers.docker_name}'"
  }
}
