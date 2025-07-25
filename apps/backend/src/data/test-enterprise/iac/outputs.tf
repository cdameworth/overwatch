output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "database_endpoint" {
  description = "RDS Oracle endpoint"
  value       = module.rds_oracle.db_instance_endpoint
  sensitive   = true
}

output "s3_bucket_id" {
  description = "S3 bucket ID"
  value       = module.s3_storage.bucket_id
}

output "load_balancer_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "load_balancer_zone_id" {
  description = "Zone ID of the load balancer"
  value       = aws_lb.main.zone_id
}