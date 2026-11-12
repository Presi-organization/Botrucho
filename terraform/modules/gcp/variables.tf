variable "project_id" {
  description = "ID del proyecto GCP con facturación y Compute Engine API habilitados."
  type        = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "project_id debe ser un ID de proyecto GCP válido."
  }
}

variable "instance_name" {
  description = "Nombre de la VM; no cambia región, zona ni tipo de máquina gratuitos."
  type        = string
  default     = "discord-bot"
  validation {
    condition     = can(regex("^[a-z]([-a-z0-9]{0,61}[a-z0-9])?$", var.instance_name))
    error_message = "Usa un nombre Compute Engine válido de hasta 63 caracteres."
  }
}

variable "ssh_public_key" {
  description = "Clave pública OpenSSH de despliegue. Nunca proporcionar una clave privada."
  type        = string
  validation {
    condition     = can(regex("^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp(256|384|521)) [A-Za-z0-9+/=]+( [^\\r\\n]+)?$", trimspace(var.ssh_public_key)))
    error_message = "Proporciona una sola clave pública OpenSSH, no un archivo privado."
  }
}

variable "ssh_source_ranges" {
  description = "Orígenes SSH. Los runners GitHub hospedados tienen IP dinámica; restringir si se dispone de runner con IP fija. Revisar también default-allow-ssh existente."
  type        = list(string)
  default     = ["0.0.0.0/0"]
  validation {
    condition     = length(var.ssh_source_ranges) > 0 && alltrue([for cidr in var.ssh_source_ranges : can(cidrnetmask(cidr))])
    error_message = "Indica al menos una red IPv4 CIDR válida."
  }
}
