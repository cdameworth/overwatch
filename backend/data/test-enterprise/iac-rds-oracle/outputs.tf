output "db_instance_id" {
  description = "RDS instance ID"
  value       = aws_db_instance.oracle.id
}

output "db_instance_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.oracle.endpoint
}

output "db_instance_port" {
  description = "RDS instance port"
  value       = aws_db_instance.oracle.port
}

output "db_subnet_group_id" {
  description = "DB subnet group ID"
  value       = aws_db_subnet_group.oracle.id
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.oracle.id
}