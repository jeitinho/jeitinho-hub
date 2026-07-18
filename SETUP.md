# SETUP — Développement local

Ce projet est **JEITINHO Platform**, construit sur Lovable Cloud (Supabase managé) avec TanStack Start v1 + React 19 + Vite 7 + Tailwind v4.

## 1. Prérequis

- **Bun** ≥ 1.1 (le lockfile est `bun.lock`, `bunfig.toml` présent)
- Node ≥ 20 (pour compatibilité outillage)
- Accès au projet Supabase existant (project ref `emxwfwfbzksqnydgiybh`)

> ⚠️ Ne PAS recréer le projet Supabase. La base et les migrations sont déjà déployées sur l'instance Cloud managée par Lovable.

## 2. Cloner et installer

```bash
git clone <repo-url> jeitinho-platform
cd jeitinho-platform
bun install
```

## 3. Variables d'environnement

Copier le template :

```bash
cp .env.example .env
```

Remplir avec les valeurs du projet Supabase Cloud :

| Variable | Où la trouver |
|---|---|
| `VITE_SUPABASE_URL` / `SUPABASE_URL` | Lovable → Cloud → Settings |
| `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` | idem (clé `anon` / publishable) |
| `VITE_SUPABASE_PROJECT_ID` | ref du projet (ex. `emxwfwfbzksqnydgiybh`) |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ **non disponible sur Lovable Cloud** — les server functions utilisent le client managé `client.server.ts` |
| `LOVABLE_API_KEY` | fourni par Lovable AI Gateway |
| `SETUP_KEY` | secret initial pour créer le premier admin via `/setup` |
| `GITHUB_API_KEY` | connecteur GitHub (publication blog) |

> Les variables `VITE_*` sont exposées au navigateur. Toutes les autres sont **serveur uniquement**.

## 4. Lancer le dev server

```bash
bun run dev
```

Vite écoute par défaut sur `http://localhost:8080`. Le routeur TanStack régénère `src/routeTree.gen.ts` à la volée — ne jamais l'éditer.

## 5. Première connexion

1. Ouvrir `http://localhost:8080/auth`
2. Créer un compte (email + mot de passe)
3. Si c'est le **premier utilisateur** de l'instance, il devient automatiquement admin (`handle_new_user` trigger)
4. Sinon, le compte passe en `pending_validation` : un admin doit l'activer via `/parametres/utilisateurs`

Pour bootstrapper un admin sur une base pré-existante : aller sur `/setup`, saisir email + `SETUP_KEY`.

## 6. Base de données

- Les migrations vivent dans `supabase/migrations/`
- **Ne PAS relancer les migrations en local** : elles sont déjà appliquées sur le projet Cloud
- Toute nouvelle migration doit être créée via l'outil Lovable (`supabase--migration`), jamais à la main
- Voir `ARCHITECTURE.md` §Migrations pour la liste exhaustive

## 7. Commandes utiles

```bash
bun run dev          # dev server
bun run build        # build production
bun run lint         # eslint
bunx tsgo            # typecheck
```

## 8. Sécurité

- `.env` n'est pas committé (`.env.local` est couvert par `*.local` dans `.gitignore` ; **ajouter `.env` manuellement** si vous en créez un contenant des secrets)
- Ne jamais logger `SUPABASE_SERVICE_ROLE_KEY` ni `SETUP_KEY`
- Les clés `VITE_*` publiables peuvent apparaître dans le bundle

## 9. Publication blog vers `rio-uncovered`

Le module Articles pousse les fichiers `.ts` générés vers `jeitinho/rio-uncovered@main` via le connecteur GitHub (`GITHUB_API_KEY`). Le déploiement Cloudflare Pages est déclenché automatiquement par ce push. Voir `ARCHITECTURE.md` §Publishers.