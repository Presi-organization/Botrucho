variable "dotenv" {
  description = "DOTENV KEY for decrypt env.vault"
  type        = string
  sensitive   = true
}

variable "ssh_user" {
  description = "SSH user for remote Docker host"
  type        = string
  sensitive   = true
}

variable "ssh_host" {
  description = "SSH host for remote Docker host"
  type        = string
  sensitive   = true
}

variable "ssh_private_key" {
  description = "Private key for SSH authentication"
  type        = string
  sensitive   = true
}

variable "ssh_port" {
  type    = string
  default = "22"
}
