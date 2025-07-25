resource "aws_lambda_function" "my_lambda" {
  function_name = "my_lambda"
  handler       = "index.handler"
  runtime       = "nodejs14.x"
  role          = "arn:aws:iam::123456789012:role/lambda-role"
  filename      = "lambda_function_payload.zip"
}

resource "aws_api_gateway_rest_api" "myApi" {
  name        = "MyApi"
  description = "API for Lambda integration"
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.my_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = aws_api_gateway_rest_api.myApi.execution_arn
}

resource "aws_s3_bucket" "my_bucket" {
  bucket = "my-app-bucket"
  acl    = "private"
}

resource "aws_eks_cluster" "my_eks" {
  name     = "my-eks-cluster"
  role_arn = "arn:aws:iam::123456789012:role/eks-cluster-role"

  vpc_config {
    subnet_ids = ["subnet-12345678", "subnet-87654321"]
  }
}

resource "aws_eks_node_group" "my_eks_nodes" {
  cluster_name    = aws_eks_cluster.my_eks.name
  node_group_name = "my-eks-nodes"
  node_role_arn   = "arn:aws:iam::123456789012:role/eks-node-role"
  subnet_ids      = ["subnet-12345678", "subnet-87654321"]
  scaling_config {
    desired_size = 2
    max_size     = 3
    min_size     = 1
  }
}

resource "aws_acm_certificate" "my_cert" {
  domain_name       = "example.com"
  validation_method = "DNS"
}

resource "aws_lb" "my_alb" {
  name               = "my-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = ["subnet-12345678", "subnet-87654321"]
  security_groups    = ["sg-12345678"]
}

resource "aws_lb_listener" "my_alb_listener" {
  load_balancer_arn = aws_lb.my_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.my_cert.arn
  default_action {
    type             = "forward"
    target_group_arn = "arn:aws:elasticloadbalancing:region:account-id:targetgroup/my-targets/1234567890123456"
  }
}

resource "aws_route53_zone" "my_zone" {
  name = "example.com."
}

resource "aws_route53_record" "my_dns" {
  zone_id = aws_route53_zone.my_zone.zone_id
  name    = "app.example.com"
  type    = "A"
  alias {
    name                   = aws_lb.my_alb.dns_name
    zone_id                = aws_lb.my_alb.zone_id
    evaluate_target_health = true
  }
}
