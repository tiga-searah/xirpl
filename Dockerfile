# ── api ─────────────────────────────────────────────
# pruner
FROM oven/bun AS api-prune
WORKDIR /app
COPY . .
RUN bunx turbo prune @xirpl/api --docker --production

# builder
FROM oven/bun AS api-build
WORKDIR /app
ENV NODE_ENV=production
COPY --from=api-prune /app/out/json .
RUN bun install --frozen-lockfile
COPY --from=api-prune /app/out/full .
COPY --from=api-prune /app/tsconfig.json .
RUN bun run --cwd apps/api build
RUN mkdir -p /app/runtime/node_modules \
  && cp -rL node_modules/.bun/node_modules/sharp /app/runtime/node_modules/sharp \
  && cp -rL node_modules/.bun/node_modules/@img /app/runtime/node_modules/@img \
  && cp -rL node_modules/.bun/node_modules/detect-libc /app/runtime/node_modules/detect-libc \
  && cp -rL node_modules/.bun/node_modules/semver /app/runtime/node_modules/semver

# runner
FROM oven/bun:slim AS api
WORKDIR /app
ENV NODE_ENV=production PORT=3611
COPY --from=api-build /app/apps/api/dist .
COPY --from=api-build /app/runtime/node_modules ./node_modules
CMD ["bun", "index.js"]

# ── web ─────────────────────────────────────────────
# pruner
FROM oven/bun AS web-prune
WORKDIR /app
COPY . .
RUN bunx turbo prune @xirpl/web --docker --production

# builder
FROM oven/bun AS web-build
WORKDIR /app
ARG API_URL=https://api-xirpl.tigasearah.my.id
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=$API_URL
COPY --from=web-prune /app/out/json .
RUN bun install --frozen-lockfile
COPY --from=web-prune /app/out/full .
COPY --from=web-prune /app/tsconfig.json .
RUN bun run --cwd apps/web build

# runner
FROM oven/bun:slim AS web
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3610
COPY --from=web-build /app/apps/web/.next/standalone .
COPY --from=web-build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=web-build /app/apps/web/public ./apps/web/public
CMD ["bun", "apps/web/server.js"]

# ── admin ───────────────────────────────────────────
# pruner
FROM oven/bun AS admin-prune
WORKDIR /app
COPY . .
RUN bunx turbo prune @xirpl/admin --docker --production

# builder
FROM oven/bun AS admin-build
WORKDIR /app
ARG API_URL=https://api-xirpl.tigasearah.my.id
ARG WEB_URL=https://xirpl.tigasearah.my.id
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=$API_URL NEXT_PUBLIC_WEB_URL=$WEB_URL
COPY --from=admin-prune /app/out/json .
RUN bun install --frozen-lockfile
COPY --from=admin-prune /app/out/full .
COPY --from=admin-prune /app/tsconfig.json .
RUN bun run --cwd apps/admin build

# runner
FROM oven/bun:slim AS admin
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3620
COPY --from=admin-build /app/apps/admin/.next/standalone .
COPY --from=admin-build /app/apps/admin/.next/static ./apps/admin/.next/static
CMD ["bun", "apps/admin/server.js"]
