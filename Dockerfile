# Multi-stage Docker build for API Doc Generator
# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend
FROM denoland/deno:alpine-1.46.3 AS backend-build
WORKDIR /app/backend
COPY backend/deno.json backend/deno.lock ./
RUN deno install --entrypoint main.ts || true

# Stage 3: Production image
FROM denoland/deno:alpine-1.46.3
WORKDIR /app

# Copy backend
COPY --from=backend-build /app/backend /app/backend

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Copy other necessary files
COPY backend/main.ts backend/router.ts backend/middleware ./backend/

# Expose port
EXPOSE 8080

# Start the server
WORKDIR /app/backend
CMD ["run", "--allow-net", "--allow-read", "--allow-env", "main.ts"]
