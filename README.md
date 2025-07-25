# Overwatch: Infrastructure Mapping & Monitoring

A comprehensive infrastructure visualization and monitoring platform that creates interactive dependency graphs from Terraform configurations with real-time telemetry integration.

## 🏗️ Architecture

```
aws-app-visualizer-prototype/
├── apps/                    # Application services
│   ├── frontend/           # Modern dashboard with D3.js visualizations
│   ├── backend/            # Node.js Express API server
│   └── database-api/       # MongoDB API service
├── docs/                   # Documentation
├── tests/                  # Test suites (E2E, integration, unit)
├── tools/                  # Development tools and utilities
├── config/                 # Configuration files
└── scripts/                # Build and deployment scripts
```

## 🚀 Quick Start

### Development Mode
```bash
# Install dependencies
npm install

# Start all services concurrently
npm start

# Or start services individually
npm run server    # Backend on :4000
npm run client    # Frontend on :3000
npm run db:api    # Database API on :5001
```

### Docker Mode
```bash
# Start full stack with MongoDB
docker-compose up

# Services will be available at:
# Frontend: http://localhost:5000
# Backend: http://localhost:4001
# Database API: http://localhost:5001
# MongoDB: localhost:27017
```

## 📊 Features

### ✅ **Implemented (Phase 1)**
- **Modern Dashboard UI** with sidebar navigation and responsive design
- **GitHub Integration** for parsing Terraform repositories
- **48+ AWS Service Icons** with comprehensive resource type mapping
- **Configuration History** with version tracking (up to 5 versions)
- **MongoDB Integration** with performance indexes and real-time updates
- **Cross-Application Dependencies** visualization and analysis
- **Interactive Graph Controls** with zoom, pan, and minimap
- **Resource Filtering** and search capabilities

### 🚧 **In Development**
- **GitHub Authentication** for private repository access
- **Interactive Resource Panels** with detailed configuration views
- **Dark/Light Theme Toggle** and enhanced UI themes

### 🔮 **Roadmap**
- **Phase 2**: Real-time telemetry & multi-cloud visualization
- **Phase 3**: Intelligent dependencies & enterprise icons
- **Phase 4**: Observability recommendation engine
- **Phase 5**: Enterprise CMDB engine
- **Phase 6**: Configuration drift detection agent
- **Phase 7**: Harness pipeline integration

## 🛠️ Development

### Project Structure
- `apps/frontend/src/` - Frontend application (HTML, CSS, JS)
- `apps/backend/src/` - Backend API with services and utilities
- `apps/database-api/src/` - MongoDB API service
- `docs/` - Architecture, API docs, and development guides
- `tests/` - E2E, integration, and unit tests
- `tools/` - Debug scripts, migration tools, monitoring utilities

### Key Technologies
- **Frontend**: Vanilla JS, D3.js, CSS Grid/Flexbox
- **Backend**: Node.js, Express, Passport (GitHub OAuth)
- **Database**: MongoDB with Mongoose ODM
- **Infrastructure**: Docker, Docker Compose
- **Testing**: Playwright (E2E), Jest (Unit), Visual Regression

### Configuration History
The platform tracks configuration changes with:
- **Version Management**: Up to 5 previous configurations stored
- **Change Metrics**: Automatic calculation of added/modified/removed resources
- **Timeline View**: Visual timeline in sidebar showing recent changes
- **Full History Modal**: Detailed version comparison and rollback capabilities
- **GitHub Integration**: Commit hash tracking and author attribution

## 🧪 Testing

```bash
# Run all tests
npm run test:all

# E2E tests with Playwright
npm run test:e2e

# Visual regression tests
npm run test:visual

# Performance tests
npm run test:performance

# Test with headed browser (for debugging)
npm run test:e2e:headed
```

## 📖 Documentation

- [Architecture Overview](docs/architecture/)
- [API Documentation](docs/api/)
- [Development Guide](docs/development/)
- [Deployment Guide](docs/deployment/)
- [Product Roadmap](docs/roadmap/CLAUDE.md)

## 🔧 Configuration

### Environment Variables
```bash
# Backend
NODE_ENV=development
SERVER_PORT=4000
DATABASE_API_URL=http://localhost:5001
SESSION_SECRET=your-session-secret
JWT_SECRET=your-jwt-secret

# GitHub Integration (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_ACCESS_TOKEN=your-personal-access-token

# Database API
MONGODB_URI=mongodb://localhost:27017/overwatch
VALID_API_KEYS=internal-automation-789
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000
```

## 🤝 Contributing

1. Follow the organized project structure
2. Add tests for new features
3. Update documentation
4. Use the Configuration History for tracking changes
5. Run the full test suite before submitting

## 📄 License

This project is licensed under the MIT License.

---

**Overwatch** - Transform your infrastructure into interactive, intelligent visualizations with real-time monitoring and automated insights.