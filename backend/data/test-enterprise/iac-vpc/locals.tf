locals {
  common_tags = merge(var.common_tags, {
    Environment = var.environment
    Region      = data.aws_region.current.name
  })
}