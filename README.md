# Defar ko

Plateforme pour trouver un ouvrier (électricien, soudeur, maçon, mécanicien, enseignant…) près de chez soi,
le contacter par WhatsApp ou par appel, et payer en sécurité via Wave.

Stack : Next.js (PWA) · Supabase · Tailwind · lucide-react. Conçu et développé par Moussa Diouf & Abdou Karim Dione.

## Démarrage

```bash
npm install
cp .env.local.example .env.local   # puis renseigne les 3 variables
npm run dev
```

L'application démarre **à vide** : aucune donnée de démonstration. Les ouvriers s'ajoutent à la fin
(espace admin > Ajouter, ou inscription des ouvriers eux-mêmes puis validation).

## Connecter Supabase (3 commandes)

1. Crée un projet sur supabase.com, copie l'URL et la clé `anon` dans `.env.local`.
2. `npm run db:link` (demande la référence du projet et le mot de passe de la base)
3. `npm run db:push` : crée tables, sécurité, fonctions et stockage des photos (`supabase/migrations/`).

Sans CLI : colle le contenu des deux fichiers de `supabase/migrations/` dans **SQL Editor**.

Premier administrateur (une seule fois, avec l'email de ton compte) :

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'ton-email@exemple.com');
```

Pendant les tests, dans Authentication > Providers > Email, tu peux désactiver « Confirm email ».

## Parcours

- **Sans compte** : parcourir les métiers, voir les fiches, écrire sur WhatsApp ou appeler directement l'ouvrier.
- **Avec compte** : « Demander une intervention » (paiement sécurisé et suivi).
  1. Frais de déplacement et diagnostic (ex. 3 000 ou 5 000 FCFA) payés via Wave
  2. L'ouvrier propose le prix final, le client accepte ; le diagnostic est déduit
  3. Paiement du reste via Wave (gardé par Defar ko)
  4. Complément éventuel : demandé par l'ouvrier, accepté ou refusé par le client
  5. L'ouvrier termine, le client confirme, l'admin reverse (commission calculée sur le montant réellement payé)
  6. Le client laisse un avis (visible sous la fiche de l'ouvrier)
- **Prix fixe** (ex. enseignement) : le client réserve et paie directement (heures × tarif).
- **Ouvrier** : inscription, profil, disponibilité (disponible / occupé / hors service), demandes reçues.
- **Admin** : valider les ouvriers, ajouter un ouvrier, vérifier les paiements Wave, reverser, régler les litiges.

## Paiement Wave

Le lien Wave Business est configuré par défaut. Pour le remplacer, renseigne `NEXT_PUBLIC_WAVE_BASE_URL` avec un lien sans montant; le bouton ajoute ou remplace le paramètre `amount`.
Le client peut modifier ce montant dans l'URL : l'admin doit **toujours vérifier le montant reçu dans Wave Business** avant de valider.

## Tests de la base

```bash
npm install --no-save @electric-sql/pglite
node supabase/tests/workflow.test.mjs
```

43 vérifications : parcours complet, commission, droits (rôles, colonnes protégées), avis.

## Play Store

L'application est une PWA : après déploiement (ex. Vercel), génère le paquet Android avec PWABuilder (pwabuilder.com)
ou Bubblewrap. Icônes prêtes : `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`.
Prévoir une politique de confidentialité et des captures d'écran.

