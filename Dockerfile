# Stage 1: Build hcl2json
FROM golang:1.23 as builder
RUN go install github.com/tmccombs/hcl2json@latest

# Stage 2: Node.js app with hcl2json
FROM node:18

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy hcl2json from builder
COPY --from=builder /go/bin/hcl2json /usr/local/bin/hcl2json

WORKDIR /app

# Copy backend files and configuration
COPY apps/backend ./apps/backend
COPY package.json ./
COPY package-lock.json ./

# Install dependencies
RUN npm install

# Expose the port
EXPOSE 4000

# Set environment for Docker
ENV NODE_ENV=development
ENV SERVER_PORT=4000

# Health check to ensure service is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/api/parse || exit 1

CMD ["npm", "run", "server"] 