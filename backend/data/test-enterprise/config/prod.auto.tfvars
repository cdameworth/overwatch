# Production Environment Variables
environment = "prod"

# VPC Configuration
vpc_cidr = "10.0.0.0/16"
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24"]

# Database Configuration
oracle_engine_version = "19.0.0.0.ru-2022-10.rur-2022-10.r1"
instance_class = "db.r5.xlarge"
allocated_storage = 500
max_allocated_storage = 2000
master_password = "ChangeMeInProduction123!"

# Backup Configuration
backup_retention_period = 14
backup_window = "03:00-04:00"
maintenance_window = "sun:04:00-sun:06:00"

# Security
deletion_protection = true
skip_final_snapshot = false

# Tags
common_tags = {
  Project     = "overwatch-enterprise-demo"
  Environment = "production"
  Owner       = "infrastructure-team"
  ManagedBy   = "terraform"
  CostCenter  = "engineering"
}