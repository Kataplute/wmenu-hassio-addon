# Dashboard Cellina'Home — Add-on Home Assistant

Planificateur de menus familial (entrées / plats / desserts, liste de courses,
calendrier saisonnier, tâches…), intégré à Home Assistant via **ingress** et
**synchronisé entre tous vos appareils** grâce à une petite base SQLite.

- **Un seul conteneur** : Node sert la SPA compilée *et* l'API.
- **100 % local** : aucune dépendance externe, données dans `/data` de l'add-on.
- **Multi-appareils** : plans, notes, liste de courses et recettes partagés
  entre téléphone, tablette et PC (dernier écrivain gagne).
- **Auth Home Assistant** : accès via la barre latérale HA (ingress).

## Installation

1. **Réglages → Modules complémentaires → Boutique** → menu ⋮ (en haut à
   droite) → **Dépôts** → ajoutez l'URL de ce dépôt.
2. L'add-on **« Dashboard Cellina'Home »** apparaît dans la boutique → **Installer**
   (le premier build compile la source, comptez quelques minutes).
3. Activez **« Démarrer au démarrage »** et **« Afficher dans la barre
   latérale »**, puis **Démarrer**.
4. Ouvrez **Menu** dans la barre latérale.

## Configuration (facultative)

Les champs Google Calendar sont laissés vides par défaut. L'intégration
Calendar nécessite un domaine **HTTPS public** (contrainte Google OAuth) et
**ne fonctionne pas sur une installation purement locale** — l'application
fonctionne pleinement sans.

Voir `DOCS.md` pour les détails.
