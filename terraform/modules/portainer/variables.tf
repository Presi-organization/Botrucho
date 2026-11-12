variable "dotenv" {
  description = "dotenvx production private key for encrypted .env.production"
  type        = string
  sensitive   = true
  validation {
    condition     = can(regex("^[a-fA-F0-9]{64}$", var.dotenv))
    error_message = "Supply the 64-character dotenvx private key, without newlines."
  }
}

variable "ssh_private_key_path" {
  description = "Path to an existing SSH private key stored outside this repository; see botrucho.example."
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

variable "ssh_port" {
  type    = string
  default = "22"
}

variable "image_repository" {
  description = "Repositorio Docker de destino, configurado explícitamente por quien active este módulo."
  type        = string
}

variable "shards" {
  description = "Positive shard count; defaults to one rather than legacy encrypted SHARDS=auto."
  type        = number
  default     = 1
  validation {
    condition     = var.shards >= 1 && floor(var.shards) == var.shards
    error_message = "shards must be a positive integer."
  }
}

variable "memory_mb" {
  description = "Whole-container memory limit including all shards and native subprocesses (MiB)."
  type        = number
  default     = 700
  validation {
    condition     = var.memory_mb >= 256 && floor(var.memory_mb) == var.memory_mb
    error_message = "memory_mb must be an integer of at least 256 MiB."
  }
}

variable "cpu_limit" {
  description = "Container CPU quota; shared e2-micro capacity still applies."
  type        = number
  default     = 0.5
  validation {
    condition     = var.cpu_limit > 0 && var.cpu_limit <= 2
    error_message = "cpu_limit must be greater than zero and at most 2."
  }
}

variable "bind_address" {
  description = "IPv4 interface for health endpoint publishing; loopback by default."
  type        = string
  default     = "127.0.0.1"
  validation {
    condition     = can(cidrnetmask("${var.bind_address}/32"))
    error_message = "bind_address must be an IPv4 address."
  }
}

variable "runtime_env_path" {
  description = "Private environment file on the remote host, relative to the SSH home directory."
  type        = string
  default     = ".config/botrucho/runtime.env"
  validation {
    condition     = can(regex("^[a-zA-Z0-9_./-]+$", var.runtime_env_path)) && length(regexall("^/|\\.\\.", var.runtime_env_path)) == 0
    error_message = "Use a shell-safe relative file path without parent traversal."
  }
}
