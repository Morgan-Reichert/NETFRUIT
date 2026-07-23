# NETFRUIT — Email transactionnel (`send-email`)

Envoie des emails de marque depuis **contact@netfruit.fun** quand un admin approuve/rejette une candidature créateur ou une série. Le destinataire et l'email sont résolus côté serveur (clé service-role) ; seuls les admins peuvent l'invoquer.

## Mise en place (à faire une fois)

1. **Créer un compte [Resend](https://resend.com)** (offre gratuite : 3 000 emails/mois).
2. **Vérifier le domaine `netfruit.fun`** dans Resend → il te donne des enregistrements **DNS (SPF/DKIM)** à ajouter chez ton registrar (là où tu gères déjà netfruit.fun). Une fois vérifié, tu peux envoyer depuis `contact@netfruit.fun`.
3. **Récupérer la clé API** Resend (`re_...`).
4. **Déployer la fonction** (nécessite la [CLI Supabase](https://supabase.com/docs/guides/cli)) :
   ```bash
   supabase login
   supabase link --project-ref <ton-project-ref>
   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
   supabase functions deploy send-email
   ```

C'est tout. Dès que la fonction est déployée + le domaine vérifié, les emails partent automatiquement à chaque décision de modération.

> Tant que ce n'est pas déployé, l'app fonctionne normalement — l'envoi d'email est *best-effort* (silencieux s'il échoue).

## Emails envoyés
- **creator_approved** — candidature acceptée 🎉
- **creator_rejected** — candidature refusée (+ motif)
- **series_published** — série approuvée ✅
- **series_rejected** — série refusée (+ motif)

Tous portent le logo NETFRUIT, un CTA « Ouvrir le Studio », et le pied `contact@netfruit.fun`.
