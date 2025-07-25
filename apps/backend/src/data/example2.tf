resource "aws_lambda_function" "secondary_lambda" {
  function_name = "secondary_lambda"
  handler       = "index.handler"
  runtime       = "nodejs14.x"
  role          = "arn:aws:iam::123456789012:role/lambda-role"
  filename      = "lambda_function_payload.zip"
}

resource "aws_api_gateway_resource" "secondary_resource" {
  rest_api_id = aws_api_gateway_rest_api.myApi.id  # Reference to example.tf's API
  parent_id   = aws_api_gateway_rest_api.myApi.root_resource_id
  path_part   = "secondary"
}

resource "aws_api_gateway_method" "secondary_method" {
  rest_api_id   = aws_api_gateway_rest_api.myApi.id  # Reference to example.tf's API
  resource_id   = aws_api_gateway_resource.secondary_resource.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "secondary_integration" {
  rest_api_id = aws_api_gateway_rest_api.myApi.id  # Reference to example.tf's API
  resource_id = aws_api_gateway_resource.secondary_resource.id
  http_method = aws_api_gateway_method.secondary_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.secondary_lambda.invoke_arn
}

resource "aws_lambda_permission" "secondary_apigw" {
  statement_id  = "AllowExecutionFromAPIGatewaySecondary"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.secondary_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = aws_api_gateway_rest_api.myApi.execution_arn
} 