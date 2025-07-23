# Overwatch: Infrastructure Mapping & Monitoring

Overwatch is a comprehensive infrastructure visualization platform that transforms complex Terraform configurations into intuitive, interactive dependency graphs. Built for teams who need to understand, audit, and communicate their cloud architecture, Overwatch provides real-time insights into AWS resource relationships and dependencies.

## 🚀 Features

### Core Visualization
- **Interactive Dependency Graphs**: D3.js-powered force-directed layouts with zoom, pan, and drag capabilities
- **Multi-Application Support**: Visualize and compare multiple applications simultaneously
- **Cross-Application Dependencies**: Identify and visualize dependencies between different applications
- **Resource Grouping**: Applications are grouped with dynamic sizing based on resource count

### Enhanced User Experience  
- **Hover Cards**: Detailed configuration information appears on hover with AWS service icons
- **Modern Dashboard**: Clean, responsive interface with navigation sidebar and controls
- **Advanced Filtering**: Filter by resource type, environment, or application
- **Visual Highlighting**: Connected nodes highlight on hover with smooth opacity transitions
- **Export Capabilities**: Export graphs and configurations for documentation

### Enterprise Features
- **GitHub Integration**: Sync with GitHub repositories for live Terraform parsing (optional)
- **Multi-Environment Support**: Toggle between Production, Development, and Staging environments  
- **Enterprise Analysis Mode**: Advanced parsing for complex repository structures
- **Official AWS Icons**: Complete library of AWS Architecture Icons (Q1 2022 package)

### Architecture Support
- **Modern Cloud Patterns**: AI/ML platforms, serverless architectures, microservices
- **Comprehensive AWS Services**: Support for 25+ AWS services including SageMaker, ECS, RDS, DynamoDB
- **Infrastructure as Code**: Full Terraform parsing with implicit and explicit dependencies
- **Cross-Service Integration**: Visualizes API integrations, messaging queues, and data flows

## Prerequisites
- [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/)
- (Optional) [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) for local development

## Getting Started

### 1. Clone the Repository
```sh
git clone <repo-url>
cd aws-app-visualizer-prototype
```

### 2. Add AWS Icons (Optional)
Download AWS SVG icons from [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/) and place them in `frontend/icons/` as described in `frontend/icons/README.txt`.

### 3. Run with Docker Compose
```sh
docker-compose up --build
```
- Frontend: [http://localhost:5000](http://localhost:5000)
- Backend API: [http://localhost:4000/api/parse](http://localhost:4000/api/parse)

### 4. View the App
Open [http://localhost:5000](http://localhost:5000) in your browser. The dependency map will be generated from the example Terraform files in `backend/data/`, showcasing:
- **Insight Engine**: AI-powered data processing platform with SageMaker, Kinesis, and DynamoDB
- **Engagement Hub**: Large-scale 3-tier application with CloudFront, ECS, and Aurora PostgreSQL

## 🧪 Testing & Quality Assurance

Overwatch includes a comprehensive test suite built with Playwright for end-to-end testing:

### Test Coverage
- **Hover Functionality**: 15+ test cases covering hover cards, positioning, and interaction
- **Visual Regression**: Screenshot-based testing for UI consistency  
- **Cross-Browser Compatibility**: Tests across Chromium, Firefox, WebKit, and mobile browsers
- **Graph Interactions**: Zoom, pan, drag, and node selection testing
- **Enterprise Features**: Repository parsing and multi-environment testing

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suites
npx playwright test tests/e2e/hover-functionality.spec.js
npx playwright test tests/e2e/visual-regression.spec.js

# Run tests with debugging
npx playwright test --headed --debug

# Generate test reports
npx playwright show-report
```

### Test Architecture
- **Global Setup**: Automated server startup and health checks
- **Test Helpers**: Reusable components for graph interactions and API testing
- **Visual Debugging**: Chrome DevTools integration for deep event analysis
- **Baseline Screenshots**: Automated visual regression detection

## 📁 Project Structure
```
backend/                    # Node.js Express backend
  ├── data/                # Example Terraform configurations
  │   ├── example-ai-platform.tf      # AI/ML infrastructure (548 lines)
  │   └── example-engagement-hub.tf   # 3-tier web application (767 lines)
  ├── server.js            # Main Express server with CORS and API endpoints
  ├── terraform-parser.js  # HCL to JSON conversion using hcl2json
  ├── dependency-engine.js # Cross-application dependency analysis
  ├── github-service.js    # GitHub API integration (optional)
  └── db.json             # LowDB storage for parsed applications

frontend/                   # D3.js visualization frontend  
  ├── app.js              # Main OverwatchVisualizer class (1500+ lines)
  ├── index.html          # Modern dashboard HTML with sidebar
  ├── icons/              # Official AWS Architecture Icons library
  │   ├── lambda.svg      # AWS Lambda
  │   ├── apigateway.svg  # API Gateway  
  │   ├── dynamodb.svg    # DynamoDB
  │   └── [25+ more AWS service icons]
  └── style.css           # Responsive CSS with CSS Variables

tests/                     # Playwright test suite
  ├── e2e/                # End-to-end test specifications
  │   ├── hover-functionality.spec.js  # 20+ hover interaction tests
  │   └── visual-regression.spec.js    # Screenshot comparison tests
  ├── helpers/            # Reusable test utilities
  │   └── test-helpers.js # GraphTestHelpers and APITestHelpers classes
  └── global-setup.js     # Automated server management

docker-compose.yml          # Multi-container development environment
Dockerfile                 # Multi-stage build with hcl2json Go tool
playwright.config.js       # Cross-browser testing configuration
package.json               # Dependencies and npm scripts
```

## 🛠️ Development & Customization

### Adding New AWS Services
1. Add SVG icon to `frontend/icons/[service-name].svg`
2. Update `awsIconMap` in `frontend/app.js`
3. Add configuration parsing in `buildConfigurationSummary()`
4. Test with new Terraform resources in `backend/data/`

### Enterprise Integration
- **GitHub Repositories**: Configure OAuth credentials for live repository syncing
- **Custom Parsers**: Extend `terraform-parser.js` for organization-specific patterns  
- **API Extensions**: Add endpoints in `server.js` for custom integrations
- **Multi-Tenancy**: Implement user authentication and data isolation

## Contributing
Pull requests and issues are welcome! Please open an issue to discuss major changes or new features.

## License
This project is a prototype and is provided as-is for demonstration and educational purposes. 