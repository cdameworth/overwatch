# Insight Engine - AI-Powered Data Processing Platform
# Demonstrates modern data platform with ML inference capabilities

# =====================================================================
# DATA INGESTION LAYER
# =====================================================================

# Kinesis Data Stream for real-time data ingestion
resource "aws_kinesis_stream" "data_stream" {
  name             = "${var.app_name}-data-stream"
  shard_count      = var.kinesis_shard_count
  retention_period = 24

  encryption_type = "KMS"
  kms_key_id      = aws_kms_key.data_encryption.arn

  tags = local.common_tags
}

# SQS Queue for batch processing
resource "aws_sqs_queue" "processing_queue" {
  name                       = "${var.app_name}-processing-queue"
  delay_seconds              = 0
  max_message_size           = 2048
  message_retention_seconds  = 1209600
  visibility_timeout_seconds = 300

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dead_letter_queue.arn
    maxReceiveCount     = 3
  })

  tags = local.common_tags
}

# Dead Letter Queue for failed messages
resource "aws_sqs_queue" "dead_letter_queue" {
  name = "${var.app_name}-dlq"
  
  tags = local.common_tags
}

# API Gateway for external data submission
resource "aws_api_gateway_rest_api" "data_ingestion_api" {
  name        = "${var.app_name}-ingestion-api"
  description = "API for external data ingestion into Insight Engine"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = local.common_tags
}

# =====================================================================
# AI/ML PROCESSING LAYER  
# =====================================================================

# S3 Bucket for ML model artifacts and training data
resource "aws_s3_bucket" "ml_artifacts" {
  bucket = "${var.app_name}-ml-artifacts-${random_id.bucket_suffix.hex}"

  tags = local.common_tags
}

resource "aws_s3_bucket_versioning" "ml_artifacts_versioning" {
  bucket = aws_s3_bucket.ml_artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "ml_artifacts_encryption" {
  bucket = aws_s3_bucket.ml_artifacts.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = aws_kms_key.data_encryption.arn
        sse_algorithm     = "aws:kms"
      }
    }
  }
}

# SageMaker execution role
resource "aws_iam_role" "sagemaker_execution_role" {
  name = "${var.app_name}-sagemaker-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "sagemaker.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "sagemaker_execution_policy" {
  role       = aws_iam_role.sagemaker_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess"
}

# SageMaker Model for real-time inference
resource "aws_sagemaker_model" "insight_model" {
  name               = "${var.app_name}-insight-model"
  execution_role_arn = aws_iam_role.sagemaker_execution_role.arn

  primary_container {
    image          = "382416733822.dkr.ecr.us-east-1.amazonaws.com/xgboost:latest"
    model_data_url = "s3://${aws_s3_bucket.ml_artifacts.bucket}/models/insight-model.tar.gz"
  }

  tags = local.common_tags
}

# SageMaker Endpoint Configuration
resource "aws_sagemaker_endpoint_configuration" "insight_endpoint_config" {
  name = "${var.app_name}-endpoint-config"

  production_variants {
    variant_name           = "primary"
    model_name            = aws_sagemaker_model.insight_model.name
    initial_instance_count = var.sagemaker_instance_count
    instance_type         = var.sagemaker_instance_type
  }

  tags = local.common_tags
}

# SageMaker Endpoint for real-time inference
resource "aws_sagemaker_endpoint" "insight_endpoint" {
  name                 = "${var.app_name}-inference-endpoint"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.insight_endpoint_config.name

  tags = local.common_tags
}

# =====================================================================
# DATA PROCESSING FUNCTIONS
# =====================================================================

# Lambda function for data validation and transformation
resource "aws_lambda_function" "data_processor" {
  filename         = "data_processor.zip"
  function_name    = "${var.app_name}-data-processor"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "index.handler"
  runtime         = "python3.9"
  timeout         = 300
  memory_size     = 512

  environment {
    variables = {
      KINESIS_STREAM_NAME = aws_kinesis_stream.data_stream.name
      SQS_QUEUE_URL      = aws_sqs_queue.processing_queue.url
      SAGEMAKER_ENDPOINT = aws_sagemaker_endpoint.insight_endpoint.name
    }
  }

  tags = local.common_tags

  depends_on = [aws_iam_role_policy_attachment.lambda_basic_execution]
}

# Lambda function for ML inference processing
resource "aws_lambda_function" "ml_inference_processor" {
  filename         = "ml_processor.zip"
  function_name    = "${var.app_name}-ml-inference"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "inference.handler"
  runtime         = "python3.9"
  timeout         = 900
  memory_size     = 1024

  environment {
    variables = {
      SAGEMAKER_ENDPOINT = aws_sagemaker_endpoint.insight_endpoint.name
      RESULTS_TABLE     = aws_dynamodb_table.inference_results.name
      DOCUMENTDB_ENDPOINT = aws_docdb_cluster.analytics_db.endpoint
    }
  }

  tags = local.common_tags

  depends_on = [aws_iam_role_policy_attachment.lambda_basic_execution]
}

# =====================================================================
# DATA STORAGE LAYER
# =====================================================================

# DynamoDB table for fast access patterns and real-time results
resource "aws_dynamodb_table" "inference_results" {
  name           = "${var.app_name}-inference-results"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"
  range_key      = "timestamp"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  attribute {
    name = "insight_type"
    type = "S"
  }

  global_secondary_index {
    name     = "InsightTypeIndex"
    hash_key = "insight_type"
    range_key = "timestamp"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = local.common_tags
}

# DocumentDB cluster for complex analytics queries
resource "aws_docdb_subnet_group" "analytics_subnet_group" {
  name       = "${var.app_name}-docdb-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = local.common_tags
}

resource "aws_docdb_cluster" "analytics_db" {
  cluster_identifier      = "${var.app_name}-analytics-cluster"
  engine                 = "docdb"
  master_username        = "insights_admin"
  master_password        = var.docdb_master_password
  backup_retention_period = 7
  preferred_backup_window = "03:00-04:00"
  skip_final_snapshot    = true
  
  db_subnet_group_name   = aws_docdb_subnet_group.analytics_subnet_group.name
  vpc_security_group_ids = [aws_security_group.docdb_sg.id]
  
  storage_encrypted = true
  kms_key_id       = aws_kms_key.data_encryption.arn

  tags = local.common_tags
}

resource "aws_docdb_cluster_instance" "analytics_db_instance" {
  count              = var.docdb_instance_count
  identifier         = "${var.app_name}-analytics-${count.index}"
  cluster_identifier = aws_docdb_cluster.analytics_db.id
  instance_class     = var.docdb_instance_class

  tags = local.common_tags
}

# S3 bucket for data lake and processed results
resource "aws_s3_bucket" "data_lake" {
  bucket = "${var.app_name}-data-lake-${random_id.bucket_suffix.hex}"

  tags = local.common_tags
}

resource "aws_s3_bucket_lifecycle_configuration" "data_lake_lifecycle" {
  bucket = aws_s3_bucket.data_lake.id

  rule {
    id     = "intelligent_tiering"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }
  }
}

# ElastiCache for caching frequent queries
resource "aws_elasticache_subnet_group" "cache_subnet_group" {
  name       = "${var.app_name}-cache-subnet-group"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_replication_group" "insights_cache" {
  replication_group_id       = "${var.app_name}-insights-cache"
  description                = "Redis cache for frequent insight queries"
  
  node_type                  = var.elasticache_node_type
  port                       = 6379
  parameter_group_name       = "default.redis7"
  
  num_cache_clusters         = var.elasticache_num_nodes
  
  subnet_group_name          = aws_elasticache_subnet_group.cache_subnet_group.name
  security_group_ids         = [aws_security_group.elasticache_sg.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = var.elasticache_auth_token

  tags = local.common_tags
}

# =====================================================================
# API & ACCESS LAYER
# =====================================================================

# ECS Cluster for containerized API services
resource "aws_ecs_cluster" "api_cluster" {
  name = "${var.app_name}-api-cluster"

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight           = 1
  }

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = local.common_tags
}

# Application Load Balancer for API services
resource "aws_lb" "api_alb" {
  name               = "${var.app_name}-api-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets           = var.public_subnet_ids

  enable_deletion_protection = false

  tags = local.common_tags
}

# Cognito User Pool for API authentication
resource "aws_cognito_user_pool" "api_users" {
  name = "${var.app_name}-api-users"

  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }

  tags = local.common_tags
}

resource "aws_cognito_user_pool_client" "api_client" {
  name         = "${var.app_name}-api-client"
  user_pool_id = aws_cognito_user_pool.api_users.id

  generate_secret = true
  
  explicit_auth_flows = [
    "ADMIN_NO_SRP_AUTH",
    "USER_PASSWORD_AUTH"
  ]
}

# =====================================================================
# MESSAGING & MONITORING
# =====================================================================

# SNS topic for alerts and notifications
resource "aws_sns_topic" "insights_alerts" {
  name = "${var.app_name}-insights-alerts"

  tags = local.common_tags
}

# EventBridge custom bus for application events
resource "aws_cloudwatch_event_bus" "insights_events" {
  name = "${var.app_name}-insights-events"

  tags = local.common_tags
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/aws/ecs/${var.app_name}-api"
  retention_in_days = 30

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.app_name}"
  retention_in_days = 14

  tags = local.common_tags
}

# =====================================================================
# SECURITY & ENCRYPTION
# =====================================================================

# KMS Key for data encryption
resource "aws_kms_key" "data_encryption" {
  description             = "KMS key for ${var.app_name} data encryption"
  deletion_window_in_days = 7

  tags = local.common_tags
}

resource "aws_kms_alias" "data_encryption_alias" {
  name          = "alias/${var.app_name}-data-encryption"
  target_key_id = aws_kms_key.data_encryption.key_id
}

# IAM roles and policies
resource "aws_iam_role" "lambda_execution_role" {
  name = "${var.app_name}-lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# =====================================================================
# SECURITY GROUPS
# =====================================================================

resource "aws_security_group" "alb_sg" {
  name_prefix = "${var.app_name}-alb-"
  vpc_id      = var.vpc_id

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

  tags = local.common_tags
}

resource "aws_security_group" "docdb_sg" {
  name_prefix = "${var.app_name}-docdb-"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 27017
    to_port     = 27017
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = local.common_tags
}

resource "aws_security_group" "elasticache_sg" {
  name_prefix = "${var.app_name}-elasticache-"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = local.common_tags
}

# =====================================================================
# RANDOM VALUES
# =====================================================================

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# =====================================================================
# LOCAL VALUES
# =====================================================================

locals {
  common_tags = {
    Application = var.app_name
    Environment = var.environment
    Platform    = "insight-engine"
    ManagedBy   = "terraform"
    Purpose     = "ai-data-processing"
  }
}