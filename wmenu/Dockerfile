# Add-on Home Assistant « Dashboard Cellina'Home » — conteneur unique.
# Le code source (front + serveur) est EMBARQUÉ dans le dépôt d'add-on, sous
# ./app (assemblé par hassio/build-addon-repo.sh) : aucun clone réseau au build,
# donc le dépôt applicatif peut rester privé.
#
# Étape 1 : compile la SPA (Vite) + installe les deps du serveur.
# Étape 2 : image d'exécution minimale, Node sert la SPA + l'API + SQLite.

FROM node:22-alpine AS build
WORKDIR /src
# Contexte de build = dossier de l'add-on ; ./app contient la source vendorée.
COPY app/ ./
# Front (Vite) → /src/dist
RUN npm ci && npm run build
# Dépendances serveur (Express) — node:sqlite est natif à Node, sans build natif.
WORKDIR /src/server
RUN npm install --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=build /src/server/src ./src
COPY --from=build /src/server/package.json ./package.json
COPY --from=build /src/server/node_modules ./node_modules
COPY --from=build /src/dist ./public
ENV NODE_ENV=production \
    DATABASE_PATH=/data/wmenu.db \
    STATIC_DIR=/app/public \
    PORT=3000
EXPOSE 3000
CMD ["node", "--experimental-sqlite", "src/index.js"]
