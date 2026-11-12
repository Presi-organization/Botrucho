variable "project_id" {
  description = "ID del proyecto GCP con facturación y Compute Engine API habilitados."
  type        = string
}

variable "instance_name" {
  description = "Nombre de la VM e2-micro."
  type        = string
  default     = "discord-bot"
}

variable "ssh_public_key" {
  description = "Una clave pública OpenSSH para botuser; nunca una clave privada."
  type        = string
}

variable "ssh_source_ranges" {
  description = "Orígenes SSH permitidos; revisar también default-allow-ssh de la VPC existente."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
