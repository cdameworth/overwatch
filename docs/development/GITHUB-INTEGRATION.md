# GitHub Integration Guide

## Overview

The AWS App Visualizer now supports **GitHub Integration**, allowing you to visualize Terraform infrastructure directly from public GitHub repositories without requiring authentication.

## Features

✅ **Public Repository Support**: Access any public GitHub repository containing Terraform files  
✅ **Automatic Discovery**: Finds all `.tf` files in the repository automatically  
✅ **Multi-Application Parsing**: Each Terraform file becomes a separate application  
✅ **Dependency Analysis**: Automatically infers resource dependencies  
✅ **Live Data**: Always fetches the latest version from the specified branch  
✅ **No Authentication Required**: Works with public repositories out of the box  

## How to Use

### Via Frontend UI

1. **Open the Application**: Navigate to http://localhost:3000
2. **Select Data Source**: In the sidebar, find "Data Source" section
3. **Choose GitHub**: Select "GitHub Repository" from the dropdown
4. **Enter Repository Details**:
   - **Owner**: GitHub username or organization (e.g., `hashicorp`)
   - **Repository**: Repository name (e.g., `terraform-provider-aws`)
   - **Branch**: Branch name (defaults to `main`)
5. **Load Repository**: Click the "Load Repository" button
6. **View Results**: The parsed infrastructure will appear in the graph

### Via API

You can also use the GitHub integration programmatically:

```bash
curl -X POST http://localhost:4000/api/parse-github \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "terraform-aws-modules",
    "repo": "terraform-aws-lambda", 
    "branch": "master"
  }'
```

## Supported Repositories

### Recommended Test Repositories

| Repository | Description | Expected Results |
|------------|-------------|------------------|
| `terraform-aws-modules/terraform-aws-lambda` | AWS Lambda module examples | 3+ applications with Lambda, SNS, SQS |
| `terraform-aws-modules/terraform-aws-vpc` | VPC configuration examples | 2+ applications with VPC resources |
| `hashicorp/terraform-provider-aws` | Official AWS provider examples | 5+ applications with various AWS services |

### Resource Types Supported

The parser recognizes all AWS resource types including:
- **Compute**: `aws_lambda_function`, `aws_instance`, `aws_ecs_service`
- **Storage**: `aws_s3_bucket`, `aws_dynamodb_table`
- **Networking**: `aws_vpc`, `aws_subnet`, `aws_api_gateway_rest_api`
- **Security**: `aws_iam_role`, `aws_iam_policy`
- **Monitoring**: `aws_cloudwatch_alarm`
- **And many more...**

## How It Works

### Backend Processing

1. **Repository Discovery**: Uses GitHub API to get the repository tree
2. **File Filtering**: Finds all `.tf` files recursively
3. **Content Fetching**: Downloads raw file content (up to 10 files for demo)
4. **Terraform Parsing**: Uses regex-based parsing to extract resources
5. **Application Grouping**: Groups resources by file into separate applications
6. **Dependency Analysis**: Infers dependencies between resources

### Data Structure

Each parsed repository returns:
```javascript
{
  "dataSource": "github",
  "repository": { "owner": "...", "repo": "...", "branch": "..." },
  "terraformFiles": ["path1.tf", "path2.tf", ...],
  "apps": [
    {
      "id": "github-app-name",
      "name": "app-name", 
      "source": "github",
      "repository": { "owner": "...", "repo": "...", "branch": "...", "path": "..." },
      "resources": { "resource": { "aws_lambda_function": { ... } } }
    }
  ],
  "resources": { /* merged resources */ },
  "dependencies": [ /* inferred dependencies */ ],
  "groups": { /* resource grouping info */ }
}
```

## Limitations

### Current Limitations

- **Public Repositories Only**: No authentication support yet
- **File Limit**: Limited to first 10 Terraform files (for demo purposes)
- **Basic Parsing**: Uses regex-based parsing (not full HCL parser)
- **No Variables**: Variable interpolation not supported
- **Rate Limits**: Subject to GitHub API rate limits

### Planned Enhancements

- **Authentication Support**: Personal access tokens for private repositories
- **Full HCL Parsing**: Complete Terraform syntax support
- **Variable Resolution**: Support for variable interpolation
- **Module Support**: Parse and visualize Terraform modules
- **Caching**: Cache parsed results to avoid rate limits

## Troubleshooting

### Common Issues

**Repository Not Found**
- Verify the owner and repository name are correct
- Ensure the repository is public
- Check that the specified branch exists

**No Terraform Files Found**
- Confirm the repository contains `.tf` files
- Try different branches (some repos use `master` instead of `main`)
- Check if files are in subdirectories

**Parsing Errors**
- The basic parser may not handle complex Terraform syntax
- Try repositories with simpler Terraform configurations
- Check the browser console for detailed error messages

**Rate Limit Exceeded**
- GitHub API has rate limits for unauthenticated requests
- Wait a few minutes before trying again
- Consider implementing authentication for higher limits

### Getting Help

1. Check the browser console for detailed error messages
2. Verify the backend server is running on port 4000
3. Test the API endpoint directly using curl
4. Review the server logs for detailed error information

## Testing

Run the included test script to verify GitHub integration:

```bash
node test-github-integration.js
```

This will test multiple repositories and display the results.