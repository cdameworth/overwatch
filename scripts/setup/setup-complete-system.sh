#!/bin/bash

# Overwatch Complete System Setup Script
# This script sets up the entire multi-service architecture with MongoDB, API, and telemetry

set -e

echo "🚀 Setting up Overwatch Complete System"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_success "Docker is running"

# Check if docker-compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    print_error "docker-compose is not installed. Please install docker-compose and try again."
    exit 1
fi

print_success "docker-compose is available"

# Clean up any existing containers
print_status "Cleaning up existing containers..."
docker-compose down --volumes --remove-orphans > /dev/null 2>&1 || true

# Remove any orphaned containers
docker container prune -f > /dev/null 2>&1 || true
docker volume prune -f > /dev/null 2>&1 || true

print_success "Cleanup completed"

# Build and start all services
print_status "Building and starting all services..."
docker-compose up --build -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."

# Function to wait for a service to be healthy
wait_for_service() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service_name on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:$port/health > /dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        if [ $attempt -eq 1 ]; then
            print_status "Waiting for $service_name to start..."
        fi
        
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within $((max_attempts * 2)) seconds"
    return 1
}

# Wait for MongoDB to be ready
print_status "Waiting for MongoDB to be ready..."
attempt=1
max_attempts=30
while [ $attempt -le $max_attempts ]; do
    if docker-compose exec -T overwatch-db mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        print_success "MongoDB is ready!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "MongoDB failed to start"
        exit 1
    fi
    
    sleep 2
    attempt=$((attempt + 1))
done

# Wait for Database API
wait_for_service "Database API" 5001

# Wait for Main Backend (using /api/parse endpoint instead of /health)
print_status "Waiting for Main Backend on port 4000..."
attempt=1
max_attempts=30
while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost:4000/api/parse > /dev/null 2>&1; then
        print_success "Main Backend is ready!"
        break
    fi
    
    if [ $attempt -eq 1 ]; then
        print_status "Waiting for Main Backend to start..."
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "Main Backend failed to start within $((max_attempts * 2)) seconds"
        exit 1
    fi
    
    sleep 2
    attempt=$((attempt + 1))
done

# Wait for Frontend
print_status "Waiting for Frontend on port 5000..."
attempt=1
while [ $attempt -le 15 ]; do
    if curl -f http://localhost:5000 > /dev/null 2>&1; then
        print_success "Frontend is ready!"
        break
    fi
    
    if [ $attempt -eq 15 ]; then
        print_error "Frontend failed to start"
        exit 1
    fi
    
    sleep 2
    attempt=$((attempt + 1))
done

# Run database migration and setup
print_status "Running database migration and setup..."

# Run the migration script inside the database-api container where dependencies are available
print_status "Running database migration inside container..."
docker-compose exec -T database-api npm run migrate

# Generate sample telemetry data
print_status "Generating sample telemetry data..."
sleep 5  # Give services time to fully start

# Test API endpoints
print_status "Testing API endpoints..."

# Test main backend
if curl -f http://localhost:4000/api/parse > /dev/null 2>&1; then
    print_success "Main backend API is responding"
else
    print_warning "Main backend API is not responding properly"
fi

# Test database API
if curl -f http://localhost:5001/health > /dev/null 2>&1; then
    print_success "Database API is responding"
else
    print_warning "Database API is not responding properly"
fi

# Generate historical telemetry data for sample applications
print_status "Generating telemetry data for sample applications..."
curl -X POST http://localhost:5001/api/applications/insight-engine-demo/telemetry \
    -H "Content-Type: application/json" \
    -H "x-api-key: internal-automation-789" \
    -d '{
        "metrics": [
            {
                "metricName": "cpu_utilization",
                "value": 45.2,
                "unit": "percent",
                "environment": "production",
                "source": "cloudwatch"
            },
            {
                "metricName": "memory_utilization", 
                "value": 67.8,
                "unit": "percent",
                "environment": "production",
                "source": "cloudwatch"
            },
            {
                "metricName": "response_time",
                "value": 234,
                "unit": "milliseconds",
                "environment": "production",
                "source": "datadog"
            }
        ]
    }' > /dev/null 2>&1

curl -X POST http://localhost:5001/api/applications/engagement-hub-demo/telemetry \
    -H "Content-Type: application/json" \
    -H "x-api-key: internal-automation-789" \
    -d '{
        "metrics": [
            {
                "metricName": "cpu_utilization",
                "value": 32.1,
                "unit": "percent",
                "environment": "production",
                "source": "cloudwatch"
            },
            {
                "metricName": "error_rate",
                "value": 0.8,
                "unit": "percent",
                "environment": "production",
                "source": "datadog"
            }
        ]
    }' > /dev/null 2>&1

print_success "Sample telemetry data generated"

# Show service status
print_status "Service Status:"
echo "==============="
docker-compose ps

# Show service URLs
echo ""
print_success "🎉 Overwatch Complete System is ready!"
echo "======================================"
echo ""
echo "📱 Frontend:     http://localhost:5000"
echo "🔧 Main Backend: http://localhost:4000"
echo "🗄️  Database API: http://localhost:5001"
echo "📊 MongoDB:      mongodb://localhost:27017/overwatch"
echo ""
echo "📋 API Endpoints:"
echo "  - Applications:   GET  http://localhost:4000/api/parse"
echo "  - Health Check:   GET  http://localhost:5001/health"
echo "  - Telemetry:      GET  http://localhost:4000/api/telemetry/summary/{appId}"
echo "  - CMDB API:       GET  http://localhost:5001/external/api/applications"
echo ""
echo "🔑 API Keys for external access:"
echo "  - CMDB:           cmdb-api-key-123"
echo "  - ServiceNow:     servicenow-key-456"
echo "  - Automation:     internal-automation-789"
echo ""
echo "📖 Sample Applications:"
echo "  - insight-engine-demo"
echo "  - engagement-hub-demo"
echo ""
print_success "System is ready for development and testing!"

# Optional: Open browser
if command -v open > /dev/null 2>&1; then
    echo ""
    read -p "Would you like to open the application in your browser? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Opening application in browser..."
        open http://localhost:5000
    fi
fi

echo ""
print_status "To stop all services, run: docker-compose down"
print_status "To view logs, run: docker-compose logs -f [service-name]"
print_status "To rebuild and restart, run: ./scripts/setup-complete-system.sh"