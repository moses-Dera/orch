# Use the official Bun image
FROM oven/bun:1 as base
WORKDIR /usr/src/app

# Install dependencies into temp directory
# This will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Copy all the code and dependencies into the final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Run the app
USER bun
EXPOSE 3001/tcp
ENTRYPOINT [ "bun", "run", "src/index.ts" ]
