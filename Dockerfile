# Production Government Portal Dockerfile (NIC MeghRaj / GIGW 3.0 Ready)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV ARC_VERIFY_SESSION_SECRET="change-me-in-gov-vault-32-bytes-minimum"
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
RUN mkdir -p /app/.arc-verify-data/private_uploads && chown -R nextjs:nodejs /app/.arc-verify-data
USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
