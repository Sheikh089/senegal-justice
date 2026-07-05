# JusticeLink

## Déploiement Cloudflare Pages

Configuration attendue côté Cloudflare Pages :

- **Repository** : le dépôt GitHub connecté à ce projet Lovable
- **Production branch** : `main`
- **Framework preset** : `Vite`
- **Node.js version** : `20`
- **Install command** : `npm ci`
- **Build command** : `npm run build:cloudflare-pages`
- **Build output directory** : `dist`

Le script `build:cloudflare-pages` génère le build Vite puis ajoute `dist/_redirects` pour que les routes React fonctionnent après refresh ou accès direct.

## Déploiement manuel via GitHub Actions

Le workflow `.github/workflows/deploy.yml` déploie `dist` vers le projet Cloudflare Pages `senegal-justice` après chaque push sur `main`.

Secrets GitHub requis :

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
