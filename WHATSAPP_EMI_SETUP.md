# EMi — passerelle WhatsApp

## Ce qui est pris en charge
- Messages directs provenant uniquement des numéros autorisés dans `EMI_WHATSAPP_ALLOWED_SENDERS`.
- Texte, image et vidéo dont le texte ou la légende contient `#EMI` (sans distinction de casse).
- Enregistrement dans Supabase et affichage dans le bloc « WhatsApp · #EMI » sur l’accueil.
- Anti-doublon en base et nettoyage périodique des publications/médias de plus de 24 heures, tant que le worker tourne.
- Reconnexion avec temporisation progressive.

**Important :** le relais des statuts WhatsApp (Actus/Statuts) n’est pas activé dans ce worker. Les statuts ne sont pas traités comme des messages directs et doivent être intégrés et testés séparément. Ne pas promettre ce comportement tant qu’il n’a pas été validé avec un vrai compte.

## Variables secrètes
Définir uniquement dans l’environnement du worker (jamais dans `NEXT_PUBLIC_*`, ni dans le navigateur) :
- `SUPABASE_URL` : URL du projet Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` : clé service role/secret du projet. Ne jamais la partager ni la mettre dans Vercel côté navigateur.
- `EMI_WHATSAPP_ALLOWED_SENDERS` : numéros autorisés, avec indicatif pays, sans `+`, séparés par des virgules. Exemple de format uniquement : `2376XXXXXXXX,2376YYYYYYYY`.
- Optionnel : `WHATSAPP_AUTH_DIR` (par défaut `whatsapp-emi-auth`).

## Démarrage
1. Déployer le worker sur un hôte Node.js 20+ qui reste allumé et conserve un volume persistant.
2. Définir les variables ci-dessus dans le gestionnaire de secrets de cet hôte.
3. Lancer `npm run whatsapp:emi` ou construire avec `Dockerfile.whatsapp`.
4. Scanner le QR avec WhatsApp > Appareils connectés. Le dossier défini par `WHATSAPP_AUTH_DIR` doit persister entre les redémarrages.
5. Envoyer un message direct depuis un numéro autorisé avec `#EMI` et vérifier l'insertion dans `publications_emi`, le média dans le bucket `emi_media` et l'affichage sur l'accueil EMi.

## Docker
Construire l'image avec `docker build -f Dockerfile.whatsapp -t emi-whatsapp-worker .`, puis exécuter avec un volume persistant monté sur `/data` et les variables d'environnement configurées. Ne pas publier le QR, les fichiers de session, ni les journaux contenant des identifiants.

## Limites et exploitation
- Ce worker est un processus permanent, pas une fonction serverless Vercel.
- Le filtrage de l'accueil masque les publications après 24 h. Le nettoyage physique des lignes et médias est périodique et s'exécute lorsque le worker est en ligne.
- Le statut « opérationnel » doit être confirmé par un test de bout en bout après association du QR et configuration des secrets.
- Baileys utilise une interface WhatsApp Web non officielle; la disponibilité et la compatibilité peuvent changer. Respecter les conditions WhatsApp et ne relayer que le contenu de comptes autorisés.
