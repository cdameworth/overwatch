FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files first
COPY ./database-api/package.json ./database-api/package-lock.json* ./

# Install dependencies in container (this ensures correct architecture)
RUN npm ci --only=production && npm cache clean --force

# Copy application code (excluding node_modules)
COPY ./database-api/server.js ./database-api/.env.example ./
COPY ./database ./database

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5001/health || exit 1

# Start the application
CMD ["npm", "start"]