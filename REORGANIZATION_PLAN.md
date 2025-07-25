# Project Reorganization Plan

## Current Issues
- Too many debug/test files in root directory
- Multiple scattered documentation files
- Mixed development artifacts in root
- Database files in multiple locations
- Scripts and utilities scattered throughout

## New Structure

```
aws-app-visualizer-prototype/
├── README.md                    # Main project documentation
├── package.json                 # Main package configuration
├── package-lock.json
├── docker-compose.yml
├── playwright.config.js
│
├── apps/                        # Application services
│   ├── frontend/               # Frontend application
│   │   ├── src/
│   │   │   ├── index.html
│   │   │   ├── app.js
│   │   │   ├── styles.css
│   │   │   └── assets/
│   │   │       └── icons/      # AWS service icons
│   │   └── package.json
│   │
│   ├── backend/                # Backend API service
│   │   ├── src/
│   │   │   ├── server.js
│   │   │   ├── services/       # Business logic services
│   │   │   ├── utils/          # Utility functions
│   │   │   └── data/           # Sample data files
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── database-api/           # Database API service
│       ├── src/
│       │   ├── server.js
│       │   └── database/
│       │       └── schemas/
│       ├── Dockerfile
│       └── package.json
│
├── config/                     # Configuration files
│   ├── environments/           # Environment-specific configs
│   └── docker/                # Docker configurations
│
├── docs/                       # Documentation
│   ├── architecture/
│   ├── api/
│   ├── deployment/
│   ├── development/
│   └── roadmap/
│
├── scripts/                    # Build and utility scripts
│   ├── setup/
│   ├── build/
│   └── deploy/
│
├── tests/                      # All testing files
│   ├── e2e/
│   ├── integration/
│   ├── unit/
│   ├── fixtures/
│   └── utils/
│
└── tools/                      # Development tools and utilities
    ├── debug/
    ├── migration/
    └── monitoring/
```

## Migration Steps
1. Create new directory structure
2. Move and organize files
3. Update import paths and references
4. Update configuration files
5. Test functionality
6. Clean up old files