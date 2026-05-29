# PaySafe — Next.js (Vercel)

Migration **Next.js 15** : même UI, même API métier (Express intégré), déployable sur **Vercel**.

## Installation (obligatoire une fois)

Double-cliquez **`setup-paysafe.bat`** ou :

```bash
cd 03_Code/paysafe
node scripts/setup-next.mjs
npm install
cp ../backend/.env .env.local
npm run db:migrate
npm run dev
```

→ http://localhost:3000

Le script `setup-next.mjs` copie le backend et le frontend depuis `../backend` et `../web`.

## Déploiement Vercel

Voir **[DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md)**

- **Root Directory** sur Vercel : `03_Code/paysafe`
- Variables : `DATABASE_POOLER_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, etc.

## Architecture

| Partie | Technologie |
|--------|-------------|
| Pages | Next.js App Router (`app/`) |
| API | Express existant via `pages/api/[[...slug]].ts` |
| BDD | Supabase PostgreSQL |

L’ancien projet (`backend/` + `web/`) reste intact.
