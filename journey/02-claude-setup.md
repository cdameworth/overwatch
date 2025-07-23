# Setting up Claude CLI Pro with AWS Bedrock on Corporate MacBook

## Overview

This guide walks through setting up Claude CLI Pro using AWS Bedrock for enterprise environments, specifically on corporate MacBooks with security restrictions. This setup provides access to Claude's most powerful capabilities while maintaining corporate compliance and security standards.

## Why AWS Bedrock for Enterprise?

### Corporate Benefits
- **Security & Compliance**: Enterprise-grade security with AWS infrastructure
- **Data Governance**: Keep sensitive data within your AWS environment
- **Cost Control**: Transparent usage-based pricing with AWS billing
- **Integration**: Seamless connection with existing AWS services
- **Audit Trail**: Complete logging and monitoring through CloudTrail

### vs. Consumer Claude Pro
| Feature | Consumer Pro | AWS Bedrock |
|---------|-------------|-------------|
| Data Security | Anthropic servers | Your AWS account |
| Compliance | Consumer-grade | Enterprise SOC2/HIPAA |
| Cost Model | $20/month flat | Pay-per-use |
| Integration | Limited | Full AWS ecosystem |
| Audit Logs | Basic | Complete CloudTrail |

## Prerequisites

### Corporate MacBook Requirements
- **macOS 12.0+** with admin privileges (or IT support)
- **AWS CLI** installed and configured
- **Homebrew** (if allowed by corporate policy)
- **Terminal** access with appropriate permissions
- **Corporate VPN** (if required for AWS access)

### AWS Account Setup
- **AWS Account** with appropriate permissions
- **IAM Role** with Bedrock access
- **Bedrock Model Access** enabled for Claude models
- **AWS CLI** configured with proper credentials

## Step 1: AWS Bedrock Configuration

### Enable Bedrock Model Access

1. **Login to AWS Console**
   ```bash
   # If using AWS SSO
   aws sso login --profile your-corporate-profile
   ```

2. **Navigate to Amazon Bedrock**
   - Go to AWS Console → Amazon Bedrock
   - Select your preferred region (us-east-1 or us-west-2 recommended)

3. **Request Model Access**
   - Click "Model access" in left sidebar
   - Find "Claude 3.5 Sonnet" and "Claude 3 Haiku"
   - Click "Request model access"
   - Fill out use case form (select "Development/Testing")
   - Submit request (usually approved within minutes)

### Create IAM Role for Claude CLI

Create an IAM policy with minimum required permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream"
            ],
            "Resource": [
                "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-*",
                "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-*"
            ]
        }
    ]
}
```

Attach this policy to your user or create a dedicated role.

## Step 2: Claude CLI Installation

### Option A: Direct Download (Recommended for Corporate)

1. **Download Claude CLI**
   ```bash
   # Create applications directory
   sudo mkdir -p /usr/local/bin
   
   # Download Claude CLI (replace with latest version)
   curl -L https://github.com/anthropics/claude-code/releases/latest/download/claude-macos -o claude
   
   # Make executable
   chmod +x claude
   
   # Move to system path
   sudo mv claude /usr/local/bin/
   ```

2. **Verify Installation**
   ```bash
   claude --version
   ```

### Option B: Homebrew (If Allowed)

```bash
# Add Anthropic tap
brew tap anthropics/claude

# Install Claude CLI
brew install claude
```

## Step 3: Configure Claude CLI for AWS Bedrock

### Create Configuration File

1. **Initialize Claude CLI**
   ```bash
   claude auth login
   ```

2. **Configure AWS Bedrock Backend**
   ```bash
   # Create config directory
   mkdir -p ~/.config/claude

   # Create configuration file
   cat > ~/.config/claude/config.json << 'EOF'
   {
     "provider": "bedrock",
     "region": "us-east-1",
     "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
     "profile": "your-aws-profile-name"
   }
   EOF
   ```

### AWS Profile Configuration

1. **Configure AWS CLI Profile**
   ```bash
   aws configure --profile claude-bedrock
   ```
   
   Enter when prompted:
   - **AWS Access Key ID**: Your corporate AWS key
   - **AWS Secret Access Key**: Your corporate secret
   - **Default region**: us-east-1 (or your preferred region)
   - **Default output format**: json

2. **Test AWS Connection**
   ```bash
   aws bedrock list-foundation-models --profile claude-bedrock
   ```

## Step 4: Corporate Security Considerations

### Network Configuration

1. **Corporate Proxy Setup** (if required)
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   export HTTPS_PROXY=http://your-corporate-proxy:port
   export HTTP_PROXY=http://your-corporate-proxy:port
   export NO_PROXY=localhost,127.0.0.1,.your-company.com
   ```

2. **Certificate Configuration** (if using corporate certificates)
   ```bash
   # Point to corporate certificate bundle
   export AWS_CA_BUNDLE=/path/to/corporate/certificates.pem
   export SSL_CERT_FILE=/path/to/corporate/certificates.pem
   ```

### Security Best Practices

1. **Credential Security**
   ```bash
   # Use AWS credential file permissions
   chmod 600 ~/.aws/credentials
   chmod 600 ~/.config/claude/config.json
   ```

2. **Session Management**
   ```bash
   # Use temporary credentials (if available)
   aws sts get-session-token --profile claude-bedrock
   ```

## Step 5: Verification and Testing

### Test Basic Functionality

1. **Simple Test**
   ```bash
   claude "What's the capital of France?"
   ```

2. **Code Generation Test**
   ```bash
   claude "Write a simple Python function to calculate factorial"
   ```

3. **Verify Bedrock Usage**
   - Check AWS Console → Bedrock → Usage
   - Confirm requests are appearing in your account

### Troubleshooting Common Issues

#### Issue: "Access Denied" Error
```bash
# Check IAM permissions
aws iam get-user --profile claude-bedrock
aws bedrock list-foundation-models --profile claude-bedrock
```

#### Issue: Corporate Firewall Blocking
```bash
# Test connectivity to Bedrock
curl -I https://bedrock.us-east-1.amazonaws.com
```

#### Issue: Certificate Errors
```bash
# Verify certificate bundle
openssl x509 -in /path/to/cert -text -noout
```

## Step 6: Advanced Configuration

### Multiple Model Configuration

Create profiles for different use cases:

```json
{
  "profiles": {
    "development": {
      "provider": "bedrock",
      "model": "anthropic.claude-3-haiku-20240307-v1:0",
      "region": "us-east-1"
    },
    "production": {
      "provider": "bedrock", 
      "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
      "region": "us-east-1"
    }
  }
}
```

### Cost Management

1. **Set Usage Budgets**
   ```bash
   # Create budget alert in AWS Console
   # Budgets → Create Budget → Usage-based budget
   ```

2. **Monitor Usage**
   ```bash
   # Check monthly usage
   aws bedrock get-usage-metrics --profile claude-bedrock
   ```

## Step 7: Team Deployment

### Shared Configuration Template

Create a template for team members:

```bash
#!/bin/bash
# setup-claude-team.sh

# Variables
AWS_PROFILE="claude-bedrock"
REGION="us-east-1"
MODEL="anthropic.claude-3-5-sonnet-20241022-v2:0"

# Create config
mkdir -p ~/.config/claude
cat > ~/.config/claude/config.json << EOF
{
  "provider": "bedrock",
  "region": "$REGION", 
  "model": "$MODEL",
  "profile": "$AWS_PROFILE"
}
EOF

echo "Claude CLI configured for AWS Bedrock"
echo "Test with: claude 'Hello, Claude!'"
```

### Documentation for Team

Create internal documentation with:
- **AWS account setup instructions**
- **IAM role assignment process**
- **Corporate compliance requirements**
- **Usage guidelines and best practices**
- **Troubleshooting contact information**

## Cost Analysis

### AWS Bedrock Pricing (as of 2024)

**Claude 3.5 Sonnet:**
- Input: $3.00 per million tokens
- Output: $15.00 per million tokens

**Claude 3 Haiku:**
- Input: $0.25 per million tokens  
- Output: $1.25 per million tokens

### Example Costs for Overwatch Project

**3-Day Development (estimated token usage):**
- Input tokens: ~500K tokens × $3.00/M = **$1.50**
- Output tokens: ~200K tokens × $15.00/M = **$3.00**
- **Total AWS Bedrock cost: ~$4.50**

Compare to Claude Pro subscription: $20/month = **$0.67/day × 3 days = $2.00**

**Result: AWS Bedrock was slightly more expensive but provided enterprise security and compliance.**

## Conclusion

Setting up Claude CLI Pro with AWS Bedrock on a corporate MacBook provides enterprise-grade AI assistance while maintaining security and compliance standards. The initial setup investment pays dividends through:

- **Secure development environment** within corporate infrastructure
- **Transparent cost tracking** through AWS billing
- **Audit compliance** for enterprise requirements
- **Scalable team deployment** across organization

The configuration enables the same conversational development experience that made the Overwatch project possible, while meeting the stringent requirements of corporate IT environments.

---

**Next:** [From Idea to Prototype: 3-Day Iteration](03-iterative-development.md)