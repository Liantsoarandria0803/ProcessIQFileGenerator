# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (caching)
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies only (skip postinstall to avoid tsc error)
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled code and assets from builder
COPY --from=builder /app/dist ./dist
# Copy assets directory (including PDF templates if any exist)
COPY assets/ ./assets/

# Set env to production
ENV NODE_ENV=production
ENV PORT=8001

EXPOSE 8001

# Start the application
CMD ["npm", "start"]
