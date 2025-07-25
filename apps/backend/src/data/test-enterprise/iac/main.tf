# Main Infrastructure Composition
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = local.common_tags
  }
}

# VPC Module
module "vpc" {
  source = "../iac-vpc"

  environment              = var.environment
  vpc_cidr                = var.vpc_cidr
  public_subnet_cidrs     = var.public_subnet_cidrs
  private_subnet_cidrs    = var.private_subnet_cidrs
  enable_dns_hostnames    = var.enable_dns_hostnames
  enable_dns_support      = var.enable_dns_support
  common_tags             = var.common_tags
}

# RDS Oracle Module
module "rds_oracle" {
  source = "../iac-rds-oracle"

  environment        = var.environment
  vpc_id            = module.vpc.vpc_id
  vpc_cidr_block    = module.vpc.vpc_cidr_block
  private_subnet_ids = module.vpc.private_subnet_ids

  oracle_engine_version    = var.oracle_engine_version
  instance_class          = var.instance_class
  allocated_storage       = var.allocated_storage
  max_allocated_storage   = var.max_allocated_storage
  master_password         = var.master_password
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  maintenance_window     = var.maintenance_window
  deletion_protection    = var.deletion_protection
  skip_final_snapshot    = var.skip_final_snapshot
  common_tags            = var.common_tags

  depends_on = [module.vpc]
}

# S3 Module
module "s3_storage" {
  source = "../iac-s3"

  environment        = var.environment
  bucket_suffix     = var.s3_bucket_suffix
  versioning_enabled = var.s3_versioning_enabled
  lifecycle_enabled  = var.s3_lifecycle_enabled
  common_tags        = var.common_tags
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = module.vpc.public_subnet_ids

  enable_deletion_protection = var.alb_deletion_protection

  tags = merge(local.common_tags, {
    Name = "${var.environment}-alb"
  })
}

resource "aws_security_group" "alb" {
  name_prefix = "${var.environment}-alb-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.environment}-alb-sg"
  })
}