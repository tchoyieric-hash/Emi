# EMi — plateforme sociale et commerciale

EMi est une application web mobile-first destinée au marché camerounais. Le dépôt contient l'application Next.js et ses intégrations Supabase.

## Stack technique

- Next.js 15, React 19 et TypeScript strict.
- Supabase : PostgreSQL, Auth, Storage et Realtime.
- Vercel : hébergement et déploiement depuis la branche `main`.
- Interface en français, identité visuelle vert-or.

## Principaux espaces du produit

Les fonctionnalités sont regroupées autour de ces domaines (leur disponibilité et leur niveau de validation doivent être vérifiés dans l'application déployée) :

- Réseau social : publications, réactions, commentaires, profils et présence.
- Médias : photos, vidéos, stories et Reels.
- Communication : conversations et notifications.
- Communauté et services : annuaire professionnel, EMi Help, Fondation, Djangui et espaces communautaires.
- Commerce : EMi Boutiques, vitrines, produits, panier, commandes et alertes vendeur.

Ne pas confondre une page ou un bouton présent dans l'interface avec un parcours entièrement validé. Les tests de bout en bout doivent confirmer chaque action avec au moins deux comptes de test.

## Structure du dépôt

- `app/` : routes, pages et composants de l'application Next.js.
- `lib/` : clients et utilitaires partagés.
- `supabase/migrations/` : migrations versionnées de base de données.
- `public/` : ressources statiques et médias de l'application.

La page d'accueil et la feuille de style globale sont historiquement volumineuses. Les évolutions doivent privilégier des composants et modules isolés plutôt que d'ajouter encore de la logique dans ces fichiers.

## Configuration locale

1. Installer une version LTS de Node.js compatible avec Next.js 15.
2. Installer les dépendances avec le gestionnaire correspondant au lockfile du dépôt.
3. Configurer les variables d'environnement Supabase dans un fichier local non versionné :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ou clé publishable compatible)
4. Lancer `npm run dev`.
5. Vérifier `npm run build` avant toute livraison.

Ne jamais placer une clé Supabase `service_role` ou une clé secrète dans une variable `NEXT_PUBLIC_*`, dans le navigateur ou dans Git.

## Commandes

- `npm run dev` : serveur de développement.
- `npm run build` : compilation de production.
- `npm run start` : serveur de production local.
- `npm run lint` : contrôle statique, si la commande est compatible avec la version de Next.js installée.

## Règles de livraison

- Travailler sur `main` conformément au flux de travail du projet.
- Vérifier le diff et les migrations avant chaque commit.
- Ne jamais exécuter une migration destructive sans sauvegarde, analyse des dépendances et validation explicite.
- Après chaque changement : vérifier le build Vercel, puis tester le parcours concerné sur mobile.
- Un déploiement Vercel `READY` confirme la compilation et la mise en ligne, pas le bon fonctionnement métier de tous les parcours.
- Tester les opérations sensibles (commandes, notifications, messagerie, permissions) avec deux comptes distincts.

## Sécurité et données

- Toutes les tables du schéma public doivent conserver RLS activé.
- Les politiques doivent vérifier l'identité ET la propriété/participation de la ligne ; `TO authenticated` seul ne suffit pas.
- Les fonctions `SECURITY DEFINER` doivent utiliser un `search_path` fixe, vérifier `auth.uid()` et contrôler précisément les rôles autorisés.
- Les opérations de commande doivent rester transactionnelles et vérifier les prix et stocks côté serveur.
- Préserver les commandes et leur historique lors de la désactivation ou suppression d'une boutique.
- Les migrations de production doivent être versionnées dans `supabase/migrations/` et vérifiées après exécution.

## État de validation

Le projet est en phase de consolidation. Les audits Supabase peuvent signaler des recommandations qui ne sont pas automatiquement des vulnérabilités (par exemple, des index jamais utilisés ou plusieurs politiques permissives). Examiner leur contexte avant toute modification.

Les parcours qui doivent disposer de tests de bout en bout dédiés sont :
- inscription, connexion et récupération de session ;
- publication et consultation de médias ;
- envoi, réception et lecture des messages ;
- création et consultation des stories ;
- création de boutique et gestion du catalogue ;
- commande acheteur, notification vendeur, changement de statut et annulation ;
- contrôle des accès entre comptes différents.

Ce README décrit les règles de développement et de validation ; il ne constitue pas une certification de toutes les fonctionnalités.
