output "vm_external_ip" {
  description = "IPv4 externa del módulo GCP activo."
  value       = module.gcp.vm_external_ip
}
