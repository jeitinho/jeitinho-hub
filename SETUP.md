# SETUP — Développement local

Ce projet est **JEITINHO Hub**, construit sur TanStack Start v1 + React 19 + Vite 7 + Tailwind v4, avec **le projet Supabase JEITINHO comme unique backend**.

## 1. Prérequis

- **Bun** ≥ 1.1 (le lockfile est `bun.lock`, `bunfig.toml` présent)
- Node ≥ 20 (pour compatibilité outillage)
- Accès au projet Supabase JEITINHO : `sxzdabtarlgozixcbzus` (`https://sxzdabtarlgozixcbzus.supabase.co`)

> ⚠️ **Le Hub ne doit utiliser aucun projet Supabase Lovable.** Toute l'authentification, la base de données, les données CRM, le catalogue, le stockage et les opérations serveur doivent utiliser exclusivement le projet `sxzdabtarlgozixcbzus`.

## 2. Cloner et installer

```bash
git clone <repo-url> jeitinho-hub
cd jeitinho-hub
bun install
```

## 3. Variables d'environnement

Copier le template :

```bash
cp .env.example .env
```

Remplir avec les valeurs du projet Supabase JEITINHO :

| Variable | Valeur / source |
|---|---|
| `VITE_SUPABASE_URL` / `SUPABASE_URL` | `https://sxzdabtarlgozixcbzus.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` | clé publishable du projet JEITINHO |
| `VITE_SUPABASE_PROJECT_ID` / `SUPABASE_PROJECT_ID` | `sxzdabtarlgozixcbzus` |
| `SUPABASE_SERVICE_ROLE_KEY` | clé service-role du projet JEITINHO, serveur uniquement |
| `SETUP_KEY` | secret initial pour créer le premier admin via `/setup` |
| `GITHUB_API_KEY` | publication blog vers `rio-uncovered` |
| `LEADS_INGEST_SECRET` | secret partagé pour `/api/public/leads` |

> Les variables `VITE_*` sont exposées au navigateur. Toutes les autres sont **serveur uniquement**.
>
> **Aucune variable `LOVABLE_*`, aucun endpoint Lovable et aucun Supabase Lovable ne doit être nécessaire au runtime.**

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
- Le projet cible est **uniquement** `sxzdabtarlgozixcbzus`
- Toute migration doit être appliquée et vérifiée sur ce projet Supabase
- Ne jamais reconnecter le Hub à un projet Supabase Lovable ou à un ancien project ref

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

Le module Articles pousse les fichiers `.ts` générés vers `jeitinho/rio-uncovered@main` via le connecteur GitHub (`GITHUB_API_KEY`). Le déploiement Cloudflare Pages est déclenché automatiquement par ce push.
