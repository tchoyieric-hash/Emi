# EMi — base d'application sociale

Application Next.js 15 / React / TypeScript avec intégration navigateur Supabase.

## Fonctionnalités incluses
- Interface responsive en français et recherche locale dans le fil.
- Inscription/connexion par e-mail avec Supabase Auth.
- Chargement des publications enregistrées dans Supabase.
- Création de publications texte et mentions « J'aime » persistantes.
- Mode aperçu avec exemples si Supabase n'est pas configuré.
- Schéma SQL initial et politiques RLS dans `supabase/schema.sql`.

## Configuration nécessaire

1. Dans Supabase, vérifie le bon projet avant toute modification.
2. Dans SQL Editor, examine puis exécute `supabase/schema.sql`. Il crée `profiles`, `posts` et `post_likes` et active leurs politiques RLS ; il ne supprime pas les données existantes. Si des tables de même nom existent déjà, arrête-toi et compare leur structure avant d'exécuter le script.
3. Dans Vercel > projet EMI > Settings > Environment Variables, ajoute pour Preview et Production :
   - `NEXT_PUBLIC_SUPABASE_URL` : URL du projet Supabase.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` : clé publique anon/publishable du même projet.
4. Redéploie le projet.
5. Teste l'inscription, confirme l'e-mail si Supabase l'exige, connecte-toi puis publie un message de test.

La clé `anon`/publishable est destinée au client avec RLS correctement activé. Ne place jamais une clé `service_role` dans une variable `NEXT_PUBLIC_*` ni dans Git.

## Limites actuelles
La messagerie, les commentaires, les stories, le stockage d'images/vidéos, les notifications et les abonnements ne sont pas encore implémentés. Les contrôles de navigation correspondants indiquent cette limite au lieu de prétendre qu'ils fonctionnent.


## Correctifs de compatibilité EMi simple
- Le fil charge uniquement les publications réelles depuis `public.posts`; les publications de démonstration ont été retirées.
- La requête et la création de publication n’utilisent plus la colonne `is_published`, absente de la table `posts` déjà créée dans le projet Supabase actuel.
- Le formulaire de connexion/inscription est disponible depuis le menu et les boutons de création.
- Cette archive ne modifie pas directement Supabase ni Vercel. Après vérification, il faut publier les fichiers dans le dépôt GitHub relié au projet Vercel `emi` (pas `emi_cameroun2`).
