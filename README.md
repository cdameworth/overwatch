# Overwatch: AWS App Visualizer Prototype

Overwatch is a prototype application for visualizing AWS infrastructure as code. It parses Terraform files, infers dependencies between AWS resources, and displays an interactive dependency map in the browser. The app is designed to help teams understand, audit, and communicate the structure of their cloud applications.

## Features
- Parses multiple Terraform files and merges their resources
- Infers dependencies between AWS resources (Lambda, API Gateway, S3, EKS, ALB, Route53, etc.)
- Visualizes resources and their dependencies as an interactive graph
- Groups resources by app (Terraform file) with labeled, colored boxes
- Supports AWS service icons for improved clarity
- Docker Compose setup for easy local development

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
Open [http://localhost:5000](http://localhost:5000) in your browser. The dependency map will be generated from the Terraform files in `backend/data/`.

## Project Structure
```
backend/         # Node.js backend, parses Terraform and infers dependencies
  data/          # Example Terraform files (example.tf, example2.tf, ...)
  server.js      # Express server
  terraform-parser.js
  dependency-engine.js
frontend/        # D3.js frontend for visualization
  app.js         # Main visualization logic
  index.html     # Entry point
  icons/         # (Optional) AWS SVG icons
Dockerfile       # Multi-stage build for backend
package.json     # Project dependencies and scripts
```

## Customizing
- Add or modify Terraform files in `backend/data/` to visualize different apps or architectures.
- Add more AWS icons to `frontend/icons/` and update the icon mapping in `frontend/app.js`.

## Contributing
Pull requests and issues are welcome! Please open an issue to discuss major changes or new features.

## License
This project is a prototype and is provided as-is for demonstration and educational purposes. 