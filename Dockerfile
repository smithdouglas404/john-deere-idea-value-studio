FROM node:22-slim AAS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g corepack@latest && corepack pnpm install

COPY . .

RUN corepack pnpm run build



FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist

COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/package.json ./package.json

COPY --from=builder /app/drizzle ./drizzle

COPY --from=builder /app/server ./server



EXPOSE 3000

CMD ["node", "dist/index.js"]

