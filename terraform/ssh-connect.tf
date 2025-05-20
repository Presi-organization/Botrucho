resource "null_resource" "deploy_botrucho" {

    
  depends_on = [ docker_registry_image.push_image ]

  connection {
    type        = "ssh"
    user        = var.ssh_user
    private_key = file(var.ssh_private_key_path)
    host        = var.ssh_host
    port        = var.ssh_port
  }

  provisioner "remote-exec" {
    inline = [
      "echo Hello from remote",
      "echo Push already"
    ]
  }
}