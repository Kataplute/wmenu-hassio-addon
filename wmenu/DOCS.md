# Documentation — Dashboard Cellina'Home

## Architecture

Conteneur unique basé sur `node:22-alpine`. Le **code source est embarqué**
dans cet add-on (sous `wmenu/app/`) : le Dockerfile build sans aucun accès
réseau au dépôt applicatif, qui peut donc rester **privé**.

- Le **front** (SPA Vite) est compilé au build et servi en statique par le
  serveur Node, avec repli SPA (`index.html`) sur les routes inconnues.
- L'**API** Express est montée sous `/api` (santé, synchro d'état, membres,
  Google Calendar) et persiste dans **SQLite** (`node:sqlite`, sans dépendance
  native) dans `/data/wmenu.db`.
- Sous **ingress**, HA sert l'app sous `/api/hassio_ingress/<token>/`. Le front
  résout l'URL de l'API relativement à `document.baseURI`, et les assets sont
  relatifs (Vite `base: "./"`) : aucune réécriture côté serveur n'est requise.

## Persistance et sauvegarde

Toutes les données vivent dans `/data` (inclus dans les **snapshots/sauvegardes
Home Assistant**). Pour repartir de zéro : arrêter l'add-on, supprimer
`/data/wmenu.db*`, redémarrer.

## Synchro multi-appareils

Les documents `planner` (plans, notes, liste de courses, déjeuners) et
`recipes` (recettes utilisateur) sont stockés côté serveur et chargés au
démarrage de l'app. Les modifications sont écrites en *write-through* (anti-
rebond ~0,7 s) ; au retour sur l'onglet, l'app relit l'état pour récupérer les
changements d'un autre appareil. La résolution de conflit est « dernier
écrivain gagne », adaptée à un usage familial séquentiel.

En l'absence d'API (ex. ouverture du build hors add-on), l'app bascule
automatiquement sur le `localStorage` du navigateur.

## Options

| Option | Rôle |
|---|---|
| `google_client_id` | Identifiant OAuth Google (Calendar) |
| `google_client_secret` | Secret OAuth Google |
| `google_redirect_uri` | URI de redirection OAuth (HTTPS requis) |
| `app_url` | URL de retour après connexion Google |

Ces options sont injectées dans l'environnement du serveur au démarrage
(lecture de `/data/options.json`). **Google Calendar exige un domaine HTTPS
public** : Google refuse les URI de redirection en `http://` hors `localhost`,
et les tokens d'ingress ne sont pas stables. Sur une installation 100 % locale,
laisser ces champs vides.

## Mise à jour

Le code source est embarqué dans l'add-on (assemblé par
`hassio/build-addon-repo.sh`). Pour publier une nouvelle version : réassembler
et republier le dépôt d'add-on (l'Action `Sync add-on repo` le fait à chaque
push sur `Home-assistant`), incrémenter `version` dans `config.yaml`, puis
**Reconstruire** l'add-on dans Home Assistant.

## Sécurité

- Accès derrière l'authentification Home Assistant (ingress), aucun port
  exposé sur le réseau.
- L'API n'écoute que dans le réseau interne de l'add-on.
- Les jetons Google (si configurés) restent côté serveur, jamais dans le front.
