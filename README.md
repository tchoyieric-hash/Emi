# EMi

EMi est une application sociale en construction, basée sur Next.js, React, TypeScript et Neon PostgreSQL, avec déploiement sur Vercel.

## État actuel

- Interface responsive en français et interactions de démonstration.
- Neon PostgreSQL configuré côté serveur via `DATABASE_URL`.
- Endpoint de diagnostic : `/api/health/db`, qui exécute une requête réelle sur la base.
- Le fil, les profils, les messages, l'authentification, les stories et les médias ne sont pas encore des fonctions de production.

## Développement local

1. Installer Node.js 20 ou plus récent.
2. Exécuter `npm install`.
3. Copier `.env.example` vers `.env.local`.
4. Renseigner `DATABASE_URL` avec l'URI PostgreSQL de Neon (ne jamais la publier ni la mettre dans une variable `NEXT_PUBLIC_*`).
5. Exécuter `npm run dev`.

## Variables d'environnement

- `DATABASE_URL` — chaîne de connexion PostgreSQL Neon, réservée au serveur.

## Vérification

Ouvrir `/api/health/db`. Une réponse avec `ok: true` confirme que l'API a exécuté une requête sur la base. Une réponse d'erreur doit être résolue avant toute fusion.

## Déploiement

Tester d'abord la branche Preview sur Vercel. Ne pas fusionner vers `main` avant validation de la connexion et des fonctions concernées.
