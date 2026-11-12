output "vm_external_ip" {
  description = "IPv4 pública efímera STANDARD; tiene coste independiente del Always Free."
  value       = google_compute_instance.bot.network_interface[0].access_config[0].nat_ip
}
