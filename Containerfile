# Stage 1: Build stage
FROM node:20-bullseye-slim AS installer

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

FROM node:20-bullseye-slim AS builder

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY --from=installer /app/node_modules ./node_modules

# Copy the rest of the application files
COPY . .

# Build the application
RUN pnpm run build

# Stage 2: Production stage
FROM node:20-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app
# Copy necessary files from builder stage
COPY --from=builder /app/.output ./.output

# Expose the port Nuxt runs on (default is 3000)
EXPOSE 3000

# Start the application
CMD ["node", ".output/server/index.mjs"]
