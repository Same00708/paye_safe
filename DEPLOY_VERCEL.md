# PaySafe sur Vercel (Next.js)

## 1. Préparer le projet (local)

```bash
cd Desktop/PaySafe_Project/03_Code/paysafe
copy ..\backend\.env .env.local
npm install
npm run db:migrate
npm run dev
```

→ http://localhost:3000

## 2. GitHub

Poussez le repo (monorepo avec `03_Code/paysafe`).

## 3. Vercel — production

1. https://vercel.com → Import GitHub  
2. **Root Directory** : `03_Code/paysafe`  
3. Framework : **Next.js**  
4. Variables d'environnement (voir `.env.production.example`) :

| Variable | Obligatoire | Notes |
|----------|-------------|--------|
| `DATABASE_POOLER_URL` | Oui | Même base Supabase que l'ancien backend |
| `JWT_SECRET` | Oui | ≥ 32 caractères aléatoires (nouvelle clé, pas le dev) |
| `ADMIN_PHONES` | Oui | `+228…` — **jamais affiché** dans l'app |
| `NEXT_PUBLIC_APP_URL` | Oui | URL Vercel `https://….vercel.app` |
| `CORS_ORIGIN` | Oui | Même URL |
| `FEDAPAY_*` | Oui | Clés réelles pour les paiements |

**Ne pas définir en production :**

- `ALLOW_SIMULATE_PAYMENT`
- `SEED_DEMO_ON_START`
- `USE_FIXED_OTP` / `EXPOSE_OTP_IN_RESPONSE`

Le build échoue si ces flags ou un `JWT_SECRET` faible sont détectés (`NODE_ENV=production`).

5. Deploy

## 4. Après déploiement

- Santé : `GET /api/health` → `{ "status": "ok" }` (réponse minimale, sans détails internes)
- Connexion : plus de comptes démo visibles sur `/connexion`
- Admin : `/admin` réservé aux comptes `role=admin` ou numéros `ADMIN_PHONES`

## Sécurité (résumé)

- Comptes démo / numéros admin **masqués** sur l'UI en production
- Simulation de paiement **désactivée** côté API et UI
- Rate limiting sur `/api/auth/*` (20 req/min/IP)
- Helmet + CORS restrictif
- Health check sans fuite d'erreurs BDD en prod

## Architecture

- **Next.js App Router** : `app/`
- **API** : `pages/api/[[...slug]].ts` → Express (`lib/server/`)
- **Supabase** : base inchangée
