# Engagement Hub - Large-Scale 3-Tier Consumer Application
# Consumes AI insights from Insight Engine to deliver personalized user experiences
# Demonstrates enterprise-grade scalability, high availability, and microservices architecture

# =====================================================================
# PRESENTATION TIER - Global Content Delivery & Static Assets
# =====================================================================

# Route53 hosted zone for custom domain
resource "aws_route53_zone" "main" {
  name = var.domain_name
  
  tags = local.common_tags
}

# CloudFront distribution for global content delivery
resource "aws_cloudfront_distribution" "main" {
  origin {
    domain_name = aws_s3_bucket.static_assets.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.static_assets.bucket}"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.s3_oai.cloudfront_access_identity_path
    }
  }

  # Additional origin for API Gateway
  origin {
    domain_name = replace(aws_api_gateway_rest_api.main_api.execution_arn, "/^.*execute-api\\./", "")
    origin_id   = "API-Gateway"
    origin_path = "/${var.api_stage_name}"
    
    custom_origin_config {
      http_port              = 443
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  
  aliases = [var.domain_name, "www.${var.domain_name}"]

  # Cache behaviors for static content
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.static_assets.bucket}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # Cache behavior for API calls
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "API-Gateway"
    compress         = true

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "CloudFront-Forwarded-Proto"]
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  price_class = "PriceClass_All"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.main.arn
    ssl_support_method  = "sni-only"
  }

  tags = local.common_tags
}

resource "aws_cloudfront_origin_access_identity" "s3_oai" {
  comment = "OAI for ${var.app_name} static assets"
}

# S3 bucket for static assets (React/Angular frontend)
resource "aws_s3_bucket" "static_assets" {
  bucket = "${var.app_name}-static-assets-${random_id.bucket_suffix.hex}"
  
  tags = local.common_tags
}

resource "aws_s3_bucket_public_access_block" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.s3_oai.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.static_assets.arn}/*"
      }
    ]
  })
}

# SSL Certificate for custom domain
resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.common_tags
}

# =====================================================================
# APPLICATION TIER - Microservices Architecture
# =====================================================================

# Application Load Balancer for microservices
resource "aws_lb" "app_alb" {
  name               = "${var.app_name}-app-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets           = var.public_subnet_ids

  enable_deletion_protection = false
  enable_http2              = true

  tags = local.common_tags
}

resource "aws_lb_target_group" "user_service" {
  name     = "${var.app_name}-user-service"
  port     = 3001
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = local.common_tags
}

resource "aws_lb_target_group" "content_service" {
  name     = "${var.app_name}-content-service"
  port     = 3002
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = local.common_tags
}

resource "aws_lb_target_group" "analytics_service" {
  name     = "${var.app_name}-analytics-service"
  port     = 3003
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = local.common_tags
}

# ALB Listeners and Rules
resource "aws_lb_listener" "app_https" {
  load_balancer_arn = aws_lb.app_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.user_service.arn
  }
}

resource "aws_lb_listener_rule" "content_service" {
  listener_arn = aws_lb_listener.app_https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.content_service.arn
  }

  condition {
    path_pattern {
      values = ["/api/content/*"]
    }
  }
}

resource "aws_lb_listener_rule" "analytics_service" {
  listener_arn = aws_lb_listener.app_https.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.analytics_service.arn
  }

  condition {
    path_pattern {
      values = ["/api/analytics/*", "/api/insights/*"]
    }
  }
}

# ECS Cluster for microservices
resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-cluster"

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight           = 1
    base             = 1
  }

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight           = 2
  }

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = local.common_tags
}

# User Management Service
resource "aws_ecs_task_definition" "user_service" {
  family                   = "${var.app_name}-user-service"
  network_mode             = "awsvpc"
  requires_attributes      = []
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn
  requires_compatibilities = ["FARGATE"]

  container_definitions = jsonencode([
    {
      name  = "user-service"
      image = "${aws_ecr_repository.user_service.repository_url}:latest"
      
      portMappings = [
        {
          containerPort = 3001
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.db_username}:${var.db_password}@${aws_rds_cluster.main.endpoint}:5432/${var.db_name}"
        },
        {
          name  = "REDIS_URL"
          value = "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
        },
        {
          name  = "INSIGHT_ENGINE_API_URL"
          value = "https://${var.insight_engine_domain}/api"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.user_service.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = local.common_tags
}

resource "aws_ecs_service" "user_service" {
  name            = "${var.app_name}-user-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.user_service.arn
  desired_count   = var.user_service_desired_count

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight           = 1
    base             = 1
  }

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight           = 2
  }

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets         = var.private_subnet_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.user_service.arn
    container_name   = "user-service"
    container_port   = 3001
  }

  depends_on = [aws_lb_listener.app_https]

  tags = local.common_tags
}

# Content Management Service  
resource "aws_ecs_task_definition" "content_service" {
  family                   = "${var.app_name}-content-service"
  network_mode             = "awsvpc"
  requires_attributes      = []
  cpu                      = 1024
  memory                   = 2048
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn
  requires_compatibilities = ["FARGATE"]

  container_definitions = jsonencode([
    {
      name  = "content-service"
      image = "${aws_ecr_repository.content_service.repository_url}:latest"
      
      portMappings = [
        {
          containerPort = 3002
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.db_username}:${var.db_password}@${aws_rds_cluster.main.endpoint}:5432/${var.db_name}"
        },
        {
          name  = "S3_CONTENT_BUCKET"
          value = aws_s3_bucket.content_storage.bucket
        },
        {
          name  = "CDN_BASE_URL"
          value = "https://${aws_cloudfront_distribution.main.domain_name}"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.content_service.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  tags = local.common_tags
}

resource "aws_ecs_service" "content_service" {
  name            = "${var.app_name}-content-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.content_service.arn
  desired_count   = var.content_service_desired_count

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight           = 1
  }

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets         = var.private_subnet_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.content_service.arn
    container_name   = "content-service"
    container_port   = 3002
  }

  depends_on = [aws_lb_listener.app_https]

  tags = local.common_tags
}

# Analytics & Insights Service (consumes from Insight Engine)
resource "aws_ecs_task_definition" "analytics_service" {
  family                   = "${var.app_name}-analytics-service"
  network_mode             = "awsvpc"
  requires_attributes      = []
  cpu                      = 2048
  memory                   = 4096
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn
  requires_compatibilities = ["FARGATE"]

  container_definitions = jsonencode([
    {
      name  = "analytics-service"
      image = "${aws_ecr_repository.analytics_service.repository_url}:latest"
      
      portMappings = [
        {
          containerPort = 3003
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.db_username}:${var.db_password}@${aws_rds_cluster.main.endpoint}:5432/${var.db_name}"
        },
        {
          name  = "REDIS_URL"
          value = "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
        },
        {
          name  = "INSIGHT_ENGINE_API_URL"
          value = "https://${var.insight_engine_domain}/api"
        },
        {
          name  = "INSIGHT_ENGINE_API_KEY"
          value = var.insight_engine_api_key
        },
        {
          name  = "OPENSEARCH_ENDPOINT"
          value = "https://${aws_opensearch_domain.analytics.endpoint}"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.analytics_service.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  tags = local.common_tags
}

resource "aws_ecs_service" "analytics_service" {
  name            = "${var.app_name}-analytics-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.analytics_service.arn
  desired_count   = var.analytics_service_desired_count

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight           = 1
  }

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets         = var.private_subnet_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.analytics_service.arn
    container_name   = "analytics-service"
    container_port   = 3003
  }

  depends_on = [aws_lb_listener.app_https]

  tags = local.common_tags
}

# ECR Repositories for microservices
resource "aws_ecr_repository" "user_service" {
  name                 = "${var.app_name}/user-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.common_tags
}

resource "aws_ecr_repository" "content_service" {
  name                 = "${var.app_name}/content-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.common_tags
}

resource "aws_ecr_repository" "analytics_service" {
  name                 = "${var.app_name}/analytics-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.common_tags
}

# API Gateway for external API access
resource "aws_api_gateway_rest_api" "main_api" {
  name        = "${var.app_name}-api"
  description = "Main API for ${var.app_name}"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = local.common_tags
}

resource "aws_api_gateway_stage" "api_stage" {
  deployment_id = aws_api_gateway_deployment.api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.main_api.id
  stage_name    = var.api_stage_name

  xray_tracing_enabled = true

  tags = local.common_tags
}

resource "aws_api_gateway_deployment" "api_deployment" {
  depends_on = [
    aws_api_gateway_method.options_method,
    aws_api_gateway_integration.options_integration
  ]

  rest_api_id = aws_api_gateway_rest_api.main_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.api_resource.id,
      aws_api_gateway_method.options_method.id,
      aws_api_gateway_integration.options_integration.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# CORS preflight
resource "aws_api_gateway_resource" "api_resource" {
  rest_api_id = aws_api_gateway_rest_api.main_api.id
  parent_id   = aws_api_gateway_rest_api.main_api.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "options_method" {
  rest_api_id   = aws_api_gateway_rest_api.main_api.id
  resource_id   = aws_api_gateway_resource.api_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_integration" {
  rest_api_id = aws_api_gateway_rest_api.main_api.id
  resource_id = aws_api_gateway_resource.api_resource.id
  http_method = aws_api_gateway_method.options_method.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# =====================================================================
# DATA TIER - Multi-Database Architecture
# =====================================================================

# Aurora PostgreSQL Cluster for transactional data
resource "aws_db_subnet_group" "main" {
  name       = "${var.app_name}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = local.common_tags
}

resource "aws_rds_cluster" "main" {
  cluster_identifier     = "${var.app_name}-aurora-cluster"
  engine                = "aurora-postgresql"
  engine_version        = var.aurora_engine_version
  database_name         = var.db_name
  master_username       = var.db_username
  master_password       = var.db_password
  
  backup_retention_period = 14
  preferred_backup_window = "03:00-04:00"
  backup_retention_period = 7
  skip_final_snapshot    = false
  final_snapshot_identifier = "${var.app_name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.aurora_sg.id]
  
  storage_encrypted = true
  kms_key_id       = aws_kms_key.data_encryption.arn
  
  # Enable performance insights
  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = local.common_tags
}

# Aurora cluster instances
resource "aws_rds_cluster_instance" "cluster_instances" {
  count              = var.aurora_instance_count
  identifier         = "${var.app_name}-aurora-${count.index}"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = var.aurora_instance_class
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring_role.arn

  tags = local.common_tags
}

# ElastiCache Redis for caching and session storage
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.app_name}-cache-subnet-group"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${var.app_name}-redis"
  description                = "Redis cluster for ${var.app_name}"
  
  node_type                  = var.elasticache_node_type
  port                       = 6379
  parameter_group_name       = "default.redis7"
  
  num_cache_clusters         = var.elasticache_num_nodes
  
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.elasticache_sg.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = var.elasticache_auth_token
  
  # Multi-AZ configuration
  automatic_failover_enabled = true
  multi_az_enabled          = true

  # Backup configuration
  snapshot_retention_limit = 5
  snapshot_window          = "03:00-05:00"

  tags = local.common_tags
}

# DynamoDB table for user sessions and preferences
resource "aws_dynamodb_table" "user_sessions" {
  name           = "${var.app_name}-user-sessions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "session_id"

  attribute {
    name = "session_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name     = "UserIdIndex"
    hash_key = "user_id"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = local.common_tags
}

resource "aws_dynamodb_table" "user_preferences" {
  name           = "${var.app_name}-user-preferences"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  tags = local.common_tags
}

# OpenSearch for analytics and search
resource "aws_opensearch_domain" "analytics" {
  domain_name    = "${var.app_name}-analytics"
  engine_version = "OpenSearch_1.3"

  cluster_config {
    instance_type          = var.opensearch_instance_type
    instance_count         = var.opensearch_instance_count
    dedicated_master_enabled = true
    master_instance_type   = var.opensearch_master_instance_type
    master_instance_count  = 3
    zone_awareness_enabled = true
    
    zone_awareness_config {
      availability_zone_count = 2
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = var.opensearch_volume_size
  }

  vpc_options {
    subnet_ids         = slice(var.private_subnet_ids, 0, 2)
    security_group_ids = [aws_security_group.opensearch_sg.id]
  }

  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https = true
  }

  tags = local.common_tags
}

# S3 bucket for content storage
resource "aws_s3_bucket" "content_storage" {
  bucket = "${var.app_name}-content-storage-${random_id.bucket_suffix.hex}"
  
  tags = local.common_tags
}

resource "aws_s3_bucket_versioning" "content_storage" {
  bucket = aws_s3_bucket.content_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "content_storage" {
  bucket = aws_s3_bucket.content_storage.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = aws_kms_key.data_encryption.arn
        sse_algorithm     = "aws:kms"
      }
    }
  }
}

# =====================================================================
# CROSS-APPLICATION INTEGRATION
# =====================================================================

# SNS topic for receiving events from Insight Engine
resource "aws_sns_topic" "insight_events" {
  name = "${var.app_name}-insight-events"
  
  tags = local.common_tags
}

# SQS queue for processing insight events
resource "aws_sqs_queue" "insight_processing" {
  name                       = "${var.app_name}-insight-processing"
  delay_seconds              = 0
  max_message_size           = 2048
  message_retention_seconds  = 1209600
  visibility_timeout_seconds = 300

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.insight_processing_dlq.arn
    maxReceiveCount     = 3
  })

  tags = local.common_tags
}

resource "aws_sqs_queue" "insight_processing_dlq" {
  name = "${var.app_name}-insight-processing-dlq"
  
  tags = local.common_tags
}

# SNS subscription to SQS
resource "aws_sns_topic_subscription" "insight_events_sqs" {
  topic_arn = aws_sns_topic.insight_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.insight_processing.arn
}

# Lambda function for processing insights from the AI platform
resource "aws_lambda_function" "insight_processor" {
  filename         = "insight_processor.zip"
  function_name    = "${var.app_name}-insight-processor"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 300
  memory_size     = 1024

  environment {
    variables = {
      DATABASE_URL           = "postgresql://${var.db_username}:${var.db_password}@${aws_rds_cluster.main.endpoint}:5432/${var.db_name}"
      REDIS_URL             = "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
      OPENSEARCH_ENDPOINT   = "https://${aws_opensearch_domain.analytics.endpoint}"
      USER_PREFERENCES_TABLE = aws_dynamodb_table.user_preferences.name
    }
  }

  tags = local.common_tags

  depends_on = [aws_iam_role_policy_attachment.lambda_basic_execution]
}

# Event source mapping for SQS to Lambda
resource "aws_lambda_event_source_mapping" "insight_processor_trigger" {
  event_source_arn = aws_sqs_queue.insight_processing.arn
  function_name    = aws_lambda_function.insight_processor.arn
  batch_size       = 10
}

# =====================================================================
# AUTO SCALING CONFIGURATION
# =====================================================================

# Auto Scaling for ECS Services
resource "aws_appautoscaling_target" "user_service" {
  max_capacity       = var.user_service_max_capacity
  min_capacity       = var.user_service_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.user_service.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "user_service_up" {
  name               = "${var.app_name}-user-service-scale-up"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.user_service.resource_id
  scalable_dimension = aws_appautoscaling_target.user_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.user_service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

resource "aws_appautoscaling_target" "content_service" {
  max_capacity       = var.content_service_max_capacity
  min_capacity       = var.content_service_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.content_service.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "content_service_up" {
  name               = "${var.app_name}-content-service-scale-up"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.content_service.resource_id
  scalable_dimension = aws_appautoscaling_target.content_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.content_service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

resource "aws_appautoscaling_target" "analytics_service" {
  max_capacity       = var.analytics_service_max_capacity
  min_capacity       = var.analytics_service_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.analytics_service.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "analytics_service_up" {
  name               = "${var.app_name}-analytics-service-scale-up"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.analytics_service.resource_id
  scalable_dimension = aws_appautoscaling_target.analytics_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.analytics_service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 80.0
  }
}

# =====================================================================
# USER AUTHENTICATION & AUTHORIZATION
# =====================================================================

# Cognito User Pool for customer authentication
resource "aws_cognito_user_pool" "main" {
  name = "${var.app_name}-users"

  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }

  schema {
    attribute_data_type = "String"
    name               = "email"
    required           = true
  }

  schema {
    attribute_data_type = "String"
    name               = "preferred_username"
    required           = false
  }

  tags = local.common_tags
}

resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.app_name}-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret                      = false
  prevent_user_existence_errors        = "ENABLED"
  enable_token_revocation             = true
  supported_identity_providers        = ["COGNITO"]

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30
}

# =====================================================================
# MONITORING & OBSERVABILITY
# =====================================================================

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "user_service" {
  name              = "/ecs/${var.app_name}/user-service"
  retention_in_days = 30

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "content_service" {
  name              = "/ecs/${var.app_name}/content-service"
  retention_in_days = 30

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "analytics_service" {
  name              = "/ecs/${var.app_name}/analytics-service"
  retention_in_days = 30

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.app_name}"
  retention_in_days = 14

  tags = local.common_tags
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.app_name}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.user_service.name],
            [".", "MemoryUtilization", ".", "."],
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.content_service.name],
            [".", "MemoryUtilization", ".", "."],
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.analytics_service.name],
            [".", "MemoryUtilization", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "ECS Service Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBClusterIdentifier", aws_rds_cluster.main.cluster_identifier],
            [".", "DatabaseConnections", ".", "."],
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", aws_elasticache_replication_group.main.replication_group_id]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Database Metrics"
          period  = 300
        }
      }
    ]
  })
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

resource "aws_security_group" "ecs_tasks" {
  name_prefix = "${var.app_name}-ecs-tasks-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 3000
    to_port         = 3999
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

resource "aws_security_group" "aurora_sg" {
  name_prefix = "${var.app_name}-aurora-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  tags = local.common_tags
}

resource "aws_security_group" "elasticache_sg" {
  name_prefix = "${var.app_name}-elasticache-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  tags = local.common_tags
}

resource "aws_security_group" "opensearch_sg" {
  name_prefix = "${var.app_name}-opensearch-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  tags = local.common_tags
}

# =====================================================================
# IAM ROLES & POLICIES
# =====================================================================

# ECS Execution Role
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.app_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.app_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "ecs_task_policy" {
  name = "${var.app_name}-ecs-task-policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${aws_s3_bucket.content_storage.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.user_sessions.arn,
          aws_dynamodb_table.user_preferences.arn,
          "${aws_dynamodb_table.user_sessions.arn}/index/*",
          "${aws_dynamodb_table.user_preferences.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "es:ESHttpGet",
          "es:ESHttpPost",
          "es:ESHttpPut"
        ]
        Resource = "${aws_opensearch_domain.analytics.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ]
        Resource = "*"
      }
    ]
  })
}

# Lambda Execution Role
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

resource "aws_iam_role_policy" "lambda_sqs_policy" {
  name = "${var.app_name}-lambda-sqs-policy"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [
          aws_sqs_queue.insight_processing.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.user_preferences.arn,
          "${aws_dynamodb_table.user_preferences.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "es:ESHttpGet",
          "es:ESHttpPost",
          "es:ESHttpPut"
        ]
        Resource = "${aws_opensearch_domain.analytics.arn}/*"
      }
    ]
  })
}

# RDS Monitoring Role
resource "aws_iam_role" "rds_monitoring_role" {
  name = "${var.app_name}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring_role_policy" {
  role       = aws_iam_role.rds_monitoring_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# =====================================================================
# ENCRYPTION & SECURITY
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

# =====================================================================
# RANDOM VALUES & LOCAL VALUES
# =====================================================================

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

locals {
  common_tags = {
    Application   = var.app_name
    Environment   = var.environment
    Platform      = "engagement-hub"
    ManagedBy     = "terraform"
    Purpose       = "consumer-application"
    Tier          = "3-tier-architecture"
    Integration   = "insight-engine-consumer"
  }
}

# =====================================================================
# OUTPUTS
# =====================================================================

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "alb_dns_name" {
  description = "DNS name of the application load balancer"
  value       = aws_lb.app_alb.dns_name
}

output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = "${aws_api_gateway_rest_api.main_api.execution_arn}/${var.api_stage_name}"
}

output "aurora_cluster_endpoint" {
  description = "Aurora cluster endpoint"
  value       = aws_rds_cluster.main.endpoint
}

output "redis_primary_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "opensearch_endpoint" {
  description = "OpenSearch domain endpoint"
  value       = aws_opensearch_domain.analytics.endpoint
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "Cognito User Pool Client ID"
  value       = aws_cognito_user_pool_client.main.id
}