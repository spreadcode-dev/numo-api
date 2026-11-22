# Debian slim (not Alpine) so argon2's prebuilt glibc binaries work; pinned to match .nvmrc.
FROM node:26.13.0-bookworm-slim AS base
# Node 26 no longer bundles Corepack, which provides the Yarn version pinned in package.json.
RUN npm install -g corepack && corepack enable
WORKDIR /app

FROM base AS build
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN yarn build

FROM base AS prod-deps
COPY package.json yarn.lock .yarnrc.yml ./
# The postinstall script runs husky, a dev dependency that a production install leaves out.
RUN npm pkg delete scripts.postinstall && yarn workspaces focus --production

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node
EXPOSE 3000
# The slim image has no curl, so the check uses Node's built-in fetch.
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3000/health').then((res) => process.exit(res.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/main.js"]
