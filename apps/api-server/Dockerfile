# ---------------------------------------------------
# Stage 1: Build Stage
# ---------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root configurations
COPY package.json package-lock.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/api-server/ ./apps/api-server/

# Install all dependencies including dev
RUN npm install

# Build shared packages and API server
RUN npm --workspace=@ovovita/shared-types run build && \
    npm --workspace=@ovovita/validation run build && \
    npm --workspace=@ovovita/ui-tokens run build && \
    npm --workspace=@ovovita/api-server run build

# ---------------------------------------------------
# Stage 2: Production Runtime
# ---------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy built artifacts and node_modules from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api-server/dist ./apps/api-server/dist
COPY --from=builder /app/apps/api-server/package.json ./apps/api-server/package.json

# Run as non-privileged user for security
USER node

EXPOSE 4000

CMD ["node", "apps/api-server/dist/server.js"]
