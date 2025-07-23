locals {
  common_tags = merge(var.common_tags, {
    Environment = var.environment
    Module      = "s3-storage"
  })
}