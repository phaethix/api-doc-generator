# Multi-stage Docker build for API Doc Generator
# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production image
FROM denoland/deno:alpine-2.3.3
WORKDIR /app

# Copy all backend source code
COPY backend/ ./backend/

# Copy frontend build output
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Expose port
EXPOSE 8080

# Start the server
WORKDIR /app/backend
ENTRYPOINT ["deno"]
CMD ["run", "--allow-net", "--allow-read", "--allow-env", "main.ts"]
