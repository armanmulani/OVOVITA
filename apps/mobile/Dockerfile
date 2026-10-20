# ---------------------------------------------------
# Stage 1: Build Mobile Web & PWA Assets
# ---------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/mobile/ ./apps/mobile/

RUN npm install

RUN npm --workspace=@ovovita/shared-types run build && \
    npm --workspace=@ovovita/ui-tokens run build && \
    npm --workspace=@ovovita/validation run build && \
    npm --workspace=@ovovita/mobile run build

# ---------------------------------------------------
# Stage 2: Serve with Nginx Alpine
# ---------------------------------------------------
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/mobile/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
