FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files first
COPY ./apps/database-api/package.json ./apps/database-api/package-lock.json* ./

# Install dependencies in container (this ensures correct architecture)
RUN npm install --omit=dev && npm cache clean --force

# Copy application code (excluding node_modules)
COPY ./apps/database-api/src ./src
COPY ./tools/migration/database/migrations ./migrations

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