variable "environment" {
  description = "Environment name"
  type        = string
}

variable "bucket_suffix" {
  description = "Suffix for the bucket name"
  type        = string
  default     = "app-storage"
}

variable "versioning_enabled" {
  description = "Enable versioning on the bucket"
  type        = bool
  default     = true
}

variable "lifecycle_enabled" {
  description = "Enable lifecycle configuration"
  type        = bool
  default     = true
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "overwatch-demo"
    ManagedBy   = "terraform"
  }
}