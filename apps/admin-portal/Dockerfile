# ---------------------------------------------------
# Stage 1: Build Frontend Assets
# ---------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/admin-portal/ ./apps/admin-portal/

RUN npm install

RUN npm --workspace=@ovovita/shared-types run build && \
    npm --workspace=@ovovita/ui-tokens run build && \
    npm --workspace=@ovovita/admin-portal run build

# ---------------------------------------------------
# Stage 2: Serve with Nginx Alpine
# ---------------------------------------------------
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/admin-portal/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
