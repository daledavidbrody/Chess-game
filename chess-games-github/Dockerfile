FROM node:22-bookworm-slim AS build

RUN apt-get update \
  && apt-get install -y python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/

RUN npm ci

COPY client client
COPY server server

RUN npm run build --workspace=client

FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
ENV DATA_DIR=/data

COPY package.json package-lock.json ./
COPY server/package.json server/

RUN npm ci --workspace=server --omit=dev

COPY server server
COPY --from=build /app/client/dist client/dist

RUN mkdir -p /data
VOLUME /data

EXPOSE 3001

CMD ["node", "server/index.js"]
