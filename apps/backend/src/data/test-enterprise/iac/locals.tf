locals {
  common_tags = merge(var.common_tags, {
    Environment = var.environment
    Module      = "main-infrastructure"
  })
}