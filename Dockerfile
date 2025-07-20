# Stage 1: Build hcl2json
FROM golang:1.23 as builder
RUN go install github.com/tmccombs/hcl2json@latest

# Stage 2: Node.js app with hcl2json
FROM node:18

# Copy hcl2json from builder
COPY --from=builder /go/bin/hcl2json /usr/local/bin/hcl2json

WORKDIR /app

COPY backend ./backend
COPY backend/data ./backend/data
COPY package.json ./
COPY package-lock.json ./

RUN npm install

CMD ["npm", "run", "server"] 