# Comptes des joueurs : mise en service

Les joueurs ont maintenant de vrais comptes (Supabase Auth : e-mail + mot de passe). Un compte peut avoir **plusieurs joueurs**
(ex. PATOU, LOUIS, LÉONIE sur le compte de Benjamin). Depuis la 1.7 il n'y a plus de mot de passe du site : le site est public, c'est le
compte qui ouvre les salles (voir « Site public (1.7) » plus bas).
Chaque salle peut aussi donner à un joueur un **pseudo de salle** (affiché seulement dans cette salle).

## Site public (1.7) : à faire, dans l'ordre

1. **SQL** : appliquer `source/public.sql` (autonome, relançable ; il est aussi à la fin de `supabase.sql`) AVANT de publier le site 1.7.
   Effet immédiat : toutes les fonctions acceptent `p_code = ''` ; les salles (scores, joueurs, chat, direct…) ne répondent plus qu'aux
   comptes connectés dont un pseudo est membre. Les appareils encore en 1.6 et connectés à un compte continuent de marcher ; les profils
   sans compte perdent l'accès aux salles (ils pourront être rattachés au compte de l'appareil en 1.7).
2. **Publier** : `BUMP=minor ./publier.sh` puis commit + push ; `node ~/jdv-tools/annonce.js` une fois GitHub Pages à jour.
3. **Realtime** (tableau de bord Supabase > Realtime > Settings) : désactiver **Allow public access** une fois les appareils passés en 1.7
   (quelques heures / un jour) : seuls les canaux privés restent possibles, autorisés par les politiques de `public.sql` (membres de la salle).
   Tant que c'est activé, les anciens canaux publics restent ouverts à quiconque a la clé publique.
4. **URL Configuration** : rien à changer (`https://gt40benjamin.github.io/jdv/**` couvre `jouer/`). Les liens des e-mails arrivent sur
   `jouer/` (nouveau site) ou sur la racine (anciens liens : l'accueil les renvoie vers `jouer/` avec le jeton).

## Comptes de famille (borne 1.40) : un joueur sur un autre téléphone

⚙ › Compte › **« 📲 Sur un autre téléphone »** : choisis LOUIS, LÉONIE… → « Créer le lien » → envoie le lien (WhatsApp, SMS) sur le téléphone
de leur maman. Ce téléphone ne voit QUE ces joueurs (ni ton compte, ni tes autres joueurs, ni tes réglages) ; ils gardent leurs salles et leurs
scores. Dans l'appli Android : « J'ai déjà un compte », pseudo + le code affiché (ex. `7RAM-CCJX-V7`). Le code ne s'affiche qu'une fois ; un
nouveau lien en refait un. « Retirer l'accès » : les autres téléphones perdent ce joueur. « Libérer » (il est grand) : son compte devient le
sien (pseudo + le code donné, ou son Google rattaché), il quitte le tien. Rien à régler dans Supabase. Serveur : `source/famille.sql`
(à relancer après public.sql). Dépannage : `select * from public.player_parents;` (qui gère qui).

## « Continuer avec Google » (borne 1.39, appli Android 1.13) : à faire par Benjamin

Le bouton « Continuer avec Google » est déjà dans la borne, mais il reste **caché** tant que Google n'est pas branché sur Supabase (la borne
le demande elle-même à Supabase : `auth/v1/settings`). Dès que l'étape 2 est faite, il apparaît tout seul, sans republier. Tu ne donnes
aucun mot de passe à personne : tu copies seulement deux codes de Google dans Supabase.

### Étape 1 : Google Cloud Console (10 minutes)

1. Va sur https://console.cloud.google.com et connecte-toi avec ton compte Google.
2. En haut à gauche, à côté du logo : **Sélectionner un projet** › **Nouveau projet**. Nom : `Borne d'arcade` › **Créer**, puis choisis-le.
3. Menu ☰ › **API et services** › **Écran de consentement OAuth** (parfois appelé **Google Auth Platform** › **Branding**) :
   - Type d'utilisateurs : **Externe** › Créer.
   - Nom de l'application : `Borne d'arcade entre amis` ; e-mail d'assistance : ton e-mail ; logo : facultatif (sans logo, pas de vérification).
   - **Domaines autorisés** : ajoute `elixirgamestudio.com` et `wplictorvvtkfikpfdnl.supabase.co`.
   - Coordonnées du développeur : ton e-mail › Enregistrer.
   - Accès aux données (scopes) : ne rien ajouter (e-mail, profil et openid suffisent).
   - **Audience / Utilisateurs test** : clique sur **Publier l'application** (« En production »). Sinon, seuls les comptes ajoutés comme
     « utilisateurs test » pourraient se connecter. Avec seulement e-mail + profil, Google ne demande aucune vérification.
4. Menu ☰ › **API et services** › **Identifiants** › **+ Créer des identifiants** › **ID client OAuth** :
   - Type d'application : **Application Web** ; nom : `Borne (Supabase)`.
   - **Origines JavaScript autorisées** : `https://elixirgamestudio.com`
   - **URI de redirection autorisés** : `https://wplictorvvtkfikpfdnl.supabase.co/auth/v1/callback` (exactement, sans espace).
   - **Créer**. Une fenêtre montre l'**ID client** (se termine par `.apps.googleusercontent.com`) et le **Code secret du client** : garde-la
     ouverte (ou télécharge le JSON) pour l'étape 2. Le code secret ne va QUE dans Supabase, jamais dans le dépôt ni dans un message.

### Étape 2 : Supabase (2 minutes)

1. https://supabase.com/dashboard › projet de la borne › **Authentication** › **Sign In / Providers** › **Google**.
2. **Enable Sign in with Google** : activé. Colle l'**ID client** dans *Client IDs* et le **code secret** dans *Client Secret (for OAuth)*.
   Laisse *Skip nonce checks* et *Allow users without an email* désactivés. **Save**.
2b. Toujours dans **Authentication** › **Sign In / Providers**, en haut de la page (réglages des utilisateurs) : **Allow manual linking** :
   **activé** › **Save changes**. C'est ce qui permet le bouton « Rattacher mon compte Google » (⚙ › Compte) aux joueurs déjà inscrits
   par e-mail + mot de passe. Sans lui, ce bouton répond « Le rattachement à Google n'est pas encore ouvert sur le serveur ».
3. **Authentication** › **URL Configuration** › **Redirect URLs** : vérifie que ces lignes y sont (elles y sont déjà depuis le déménagement) :
   `https://elixirgamestudio.com/**` (couvre `jouer/` et `connexion/`, le retour de l'appli Android) et `https://gt40benjamin.github.io/jdv/**`.
   Rien à ajouter pour l'appli : elle revient par `https://elixirgamestudio.com/connexion/`.

### Étape 3 : essayer

Ouvre https://elixirgamestudio.com/jouer/ dans un navigateur privé › « Créer un compte » : le bouton blanc « Continuer avec Google » est là.
Choisis ton compte Google : la borne revient avec « ✓ Connecté avec Google », tu choisis ton pseudo, ta tête et tes cris, « C'est parti ! ».
Si tu te connectes avec l'e-mail d'un compte qui existe déjà (créé avec un mot de passe), Supabase relie Google à CE compte : tu retrouves
tes joueurs. Dans l'appli Android, il faut la version **1.13** (page Télécharger) : Google s'ouvre dans un onglet Chrome puis revient dans l'appli.

### Ce qu'il faut savoir

- **Rattacher Google à un compte e-mail** : ⚙ › Compte › « Rattacher mon compte Google » (bouton blanc). Après, ce compte s'ouvre aussi
  avec « Continuer avec Google », même si l'adresse Google est différente de l'e-mail du compte : mêmes pseudos, mêmes scores. La ligne
  devient « Google : rattaché ✓ » avec « Détacher » (deux touches) tant qu'il reste l'e-mail + mot de passe. Une adresse Google déjà utilisée
  par un autre compte de la borne est refusée (« Ce compte Google est déjà utilisé par un autre compte de la borne »). Technique :
  `user/identities/authorize?provider=google&skip_http_redirect=true` (jeton du compte, PKCE) puis `DELETE user/identities/<id>` pour détacher.

- Un compte créé avec Google n'a pas de mot de passe : ⚙ › Compte › « Choisir un mot de passe » en ajoute un (utile dans une vieille appli
  ≤ 1.12 ou là où Google ne marche pas : on se connecte alors avec le pseudo ou l'e-mail et ce mot de passe).
- Pas de bouton dans : les applis Android ≤ 1.12, les navigateurs intégrés à Facebook, Instagram, Messenger, TikTok… (Google y refuse la
  connexion). WhatsApp ouvre les liens dans Chrome : là, ça marche.
- Couper Google : désactiver le fournisseur dans Supabase. Le bouton disparaît, les comptes restent (avec « Mot de passe oublié » pour en
  mettre un).
- Technique : flux PKCE (`authorize?provider=google&code_challenge…` puis `token?grant_type=pkce`), secret gardé sur l'appareil
  (`jdw.oauth`), section « Continuer avec Google » de shell2.js ; appli : `BorneApp.oauth` (Custom Tab) et `fr.bornearcade.app://auth`
  (MainActivity.java, manifeste) ; page de retour `source/connexion.html`. Essais : `~/jdv-tools/google/test-google.js` (navigateur, faux
  Supabase et faux Google) et `e2e-google.js` (émulateur : vrai Chrome, vraie appli d'essai).

## Ordre conseillé (mise en service des comptes, octobre 2026 : déjà fait)

1. **SQL** : lancer `source/accounts.sql` (ou `supabase.sql` en entier : il le contient à la fin) dans Supabase > SQL Editor.
   Peut être relancé. Si plus tard `members.sql`, `room-look.sql` ou `progress.sql` sont relancés **seuls**, relancer `accounts.sql` après.
2. **Tableau de bord Supabase** : réglages ci-dessous (fournisseur Email, confirmation, adresses, modèles d'e-mails, SMTP Brevo).
3. **Publier le site** (`publier.sh`).

Tant que `accounts.sql` n'est pas lancé, le site publié marche exactement comme avant (pas d'écran de compte, aucun jeton envoyé).

## 1. Authentication > Sign In / Providers > Email

- **Enable Email provider** : activé.
- **Allow new users to sign up** (Authentication > Sign In / Providers, en haut) : activé.
- **Confirm email** : au choix, le site gère les deux cas.
  - activé (conseillé) : à l'inscription, le joueur reçoit un lien ; tant qu'il ne l'a pas ouvert, son pseudo n'est **pas encore protégé**
    (bannière « Confirme ton e-mail » sur l'accueil). Le lien ouvert sur n'importe quel appareil connecte cet appareil et protège le pseudo.
  - désactivé : le compte marche tout de suite (mais une adresse mal tapée ne se voit pas, et « mot de passe oublié » ne pourra pas l'aider).
- **Minimum password length** : 6 (le site demande au moins 6 caractères).
- **Secure password change** : **désactivé** (sinon « Changer mon mot de passe » dans ⚙ demande une reconnexion récente).
- **Secure email change** : sans importance (le site ne change pas l'e-mail).

## 2. Authentication > URL Configuration

- **Site URL** : `https://elixirgamestudio.com/` (depuis le déménagement d'octobre 2026 ; avant : `https://gt40benjamin.github.io/jdv/`)
- **Redirect URLs** (garder les anciennes, qui redirigent vers la nouvelle adresse) :
  - `https://elixirgamestudio.com/`
  - `https://elixirgamestudio.com/**`
  - `https://gt40benjamin.github.io/jdv/`
  - `https://gt40benjamin.github.io/jdv/**`

Le site envoie `redirect_to` = sa propre adresse. Les liens des e-mails s'ouvrent dans le **navigateur** du téléphone (pas dans l'appli
Android) : la borne s'ouvre directement (plus de mot de passe du site), puis l'écran « Choisis ton nouveau mot de passe » (ou « E-mail confirmé ») apparaît.
Le nouveau mot de passe sert ensuite partout, appli comprise.

## 3. Authentication > Emails > Templates (en français, prêts à coller)

Variables Supabase utilisées : `{{ .ConfirmationURL }}` (le lien), `{{ .Data.pseudo }}` (le pseudo choisi à l'inscription).

### Confirm signup

Sujet :
```
Borne d'arcade : confirme ton adresse e-mail
```
Corps :
```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto;padding:24px;background:#111d27;color:#e9f0f3;border-radius:16px">
  <h2 style="margin:0 0 12px;color:#ffd34d">Salut {{ .Data.pseudo }} !</h2>
  <p>Tu viens de créer ton compte sur la <b>Borne d'arcade entre amis</b>.</p>
  <p>Touche le bouton pour confirmer ton adresse : ton pseudo sera protégé, personne d'autre ne pourra jouer sous ton nom.</p>
  <p style="text-align:center;margin:24px 0">
    <a href="{{ .ConfirmationURL }}" style="background:#ffa630;color:#0b141c;padding:14px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Confirmer mon e-mail</a>
  </p>
  <p style="font-size:13px;color:#8aa0ae">Tu n'as rien demandé ? Ignore simplement ce message.</p>
</div>
```

### Reset password (Recovery)

Sujet :
```
Borne d'arcade : choisis un nouveau mot de passe
```
Corps :
```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto;padding:24px;background:#111d27;color:#e9f0f3;border-radius:16px">
  <h2 style="margin:0 0 12px;color:#ffd34d">Mot de passe oublié ?</h2>
  <p>Pas de panique ! Touche le bouton pour choisir un nouveau mot de passe pour ton compte de la <b>Borne d'arcade entre amis</b>.</p>
  <p style="text-align:center;margin:24px 0">
    <a href="{{ .ConfirmationURL }}" style="background:#ffa630;color:#0b141c;padding:14px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Choisir mon nouveau mot de passe</a>
  </p>
  <p style="font-size:13px;color:#8aa0ae">Le lien ne marche qu'une fois et pendant une heure. Tu n'as rien demandé ? Ignore ce message : ton mot de passe ne change pas.</p>
</div>
```

### Magic link (pas utilisé par le site, mais au cas où)

Sujet :
```
Borne d'arcade : ton lien de connexion
```
Corps :
```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto;padding:24px;background:#111d27;color:#e9f0f3;border-radius:16px">
  <h2 style="margin:0 0 12px;color:#ffd34d">Ton lien de connexion</h2>
  <p>Touche le bouton pour te connecter à la <b>Borne d'arcade entre amis</b>.</p>
  <p style="text-align:center;margin:24px 0">
    <a href="{{ .ConfirmationURL }}" style="background:#ffa630;color:#0b141c;padding:14px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Me connecter</a>
  </p>
  <p style="font-size:13px;color:#8aa0ae">Tu n'as rien demandé ? Ignore ce message.</p>
</div>
```

### Change email address (pas utilisé par le site)

Sujet :
```
Borne d'arcade : confirme ta nouvelle adresse
```
Corps :
```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto;padding:24px;background:#111d27;color:#e9f0f3;border-radius:16px">
  <p>Touche le bouton pour utiliser cette nouvelle adresse pour ton compte de la <b>Borne d'arcade entre amis</b>.</p>
  <p style="text-align:center;margin:24px 0">
    <a href="{{ .ConfirmationURL }}" style="background:#ffa630;color:#0b141c;padding:14px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Confirmer la nouvelle adresse</a>
  </p>
</div>
```

## 4. Authentication > Emails > SMTP Settings (Brevo)

Sans SMTP à soi, Supabase n'envoie que quelques e-mails par heure (et seulement aux membres du projet) : il faut Brevo.

Dans Brevo : **Senders, Domains & Dedicated IPs** > ajouter et vérifier l'adresse expéditrice ; puis **SMTP & API** > onglet SMTP >
**Generate a new SMTP key**.

Dans Supabase, **Enable Custom SMTP** puis :

| Champ Supabase | Valeur |
|---|---|
| Sender email | l'adresse vérifiée dans Brevo (ex. `borne@ton-domaine.fr`) |
| Sender name | `Borne d'arcade` |
| Host | `smtp-relay.brevo.com` |
| Port number | `587` |
| Minimum interval between emails being sent | `60` (secondes, par utilisateur) |
| Username | l'identifiant SMTP affiché par Brevo (`xxxxxx@smtp-brevo.com`) |
| Password | la **clé SMTP** générée (pas le mot de passe du compte Brevo) |

Puis **Authentication > Rate Limits** : « Rate limit for sending emails » à 30 par heure (par ex.).

## Ce que voient les joueurs

- **Nouvel appareil** : la borne s'ouvre en **invité** (bandeau « Crée ton compte pour enregistrer tes scores et rejoindre tes copains ») ;
  « Créer un compte » (pseudo + tête + cri + e-mail + mot de passe ; un enfant va sur le compte de l'appareil) |
  « J'ai déjà un compte » (**e-mail ou pseudo** + mot de passe ; avec l'e-mail et plusieurs joueurs sur le compte : « qui joue ? »).
  Un pseudo protégé tapé dans « Nouveau joueur » : « REMS a un compte : connecte-toi ».
- **Appareil déjà connecté** : un nouveau joueur est rattaché au compte de l'appareil (choix si plusieurs comptes, ou « Nouveau compte »).
  « Qui joue ? » montre les « Joueurs de mon compte » à ajouter sur l'appareil.
- **Joueurs existants** (passage obligatoire) : au retour, fenêtre « Protège ton pseudo » qu'on ne peut pas fermer : pseudo à confirmer
  (ou changer), e-mail + mot de passe, et « Ajouter aussi LOUIS et LÉONIE à ce compte » pour les autres joueurs de l'appareil. Sorties :
  « J'ai déjà un compte », « Plus tard : jouer en invité » (sans salle ni score, confirmé en 2 touches), « Changer de joueur ».
  Pseudo déjà protégé par quelqu'un d'autre : « Connecte-toi » ou « choisir un autre pseudo ». Sans réseau, rien ne bloque.
- **⚙** : e-mail du compte (masqué : `be•••@domaine.fr`), « Changer mon mot de passe », « Se déconnecter de cet appareil » (le compte
  et ses joueurs quittent l'appareil). Pseudo de salle : dans « Seulement dans <salle> », champ « Mon pseudo dans <salle> ».
- **Mot de passe oublié** : depuis l'e-mail ou le pseudo ; l'e-mail part à l'adresse du compte (jamais affichée).

## Dépannage (SQL Editor)

```sql
-- à qui appartient un pseudo
select p.name, u.email from public.players p left join auth.users u on u.id = p.user_id where p.name = 'REMS';
-- libérer un pseudo (pris par erreur, compte perdu) : il redevient libre, le prochain compte qui le réclame le protège
update public.players set user_id = null where name = 'REMS';
-- passer un pseudo sur un autre compte
update public.players set user_id = (select id from auth.users where email = 'nouveau@exemple.fr') where name = 'REMS';
-- débloquer « trop d'essais » de la connexion par pseudo
delete from public.login_tries where name = 'REMS';
```
Supprimer un utilisateur (Authentication > Users) libère aussi tous ses pseudos.

## Risques restants

- **Première protection** : pendant la transition, un pseudo existant sans compte est protégé par le **premier** compte qui le réclame
  (le serveur ne sait pas quel appareil l'utilisait avant). Un copain malin pourrait protéger « REMS » avant REMS : voir « Dépannage ».
  Conseil : prévenir la bande et la faire passer vite (le passage est obligatoire dès la mise à jour).
- **Connexion par pseudo** (1.7) : `login_name` ne renvoie l'e-mail du compte qu'avec le BON mot de passe ; « mot de passe oublié » depuis un
  pseudo ne montre que l'adresse masquée (`recover_hint`) et demande de la taper en entier. Essais limités (10 par pseudo, 60 en tout / 10 min).
  `login_email` reste pour les vieux appareils mais exige l'ancien mot de passe du site (jamais publié).
  visible dans les outils du navigateur). Limité à 10 essais par pseudo et 60 en tout par 10 minutes. Supabase limite en plus les
  essais de mot de passe.
- **Profils « sans compte »** (enfants) : depuis la 1.7 ils jouent en invité (pas de salle) ; sur un appareil connecté, le bandeau propose
  « Ajouter LOUIS au compte » (un compte = plusieurs joueurs) ; « Protège ton pseudo » propose aussi de les ajouter.
  ou changer de pseudo.
- **E-mail pas encore confirmé** : le pseudo reste non protégé jusqu'au clic sur le lien (bannière de rappel, pas de blocage).
- **Jetons** gardés dans le stockage local de l'appareil (comme le fait Supabase lui-même) ; rafraîchis automatiquement ;
  « Se déconnecter » les révoque.
- Certains antivirus de messagerie ouvrent les liens tout seuls : le lien peut alors être « déjà utilisé » → redemander un e-mail.
- **Pseudo de salle** : unique dans la salle au moment où on le choisit ; si un nouveau membre arrive avec un pseudo principal égal au pseudo
  de salle d'un autre, les deux noms se ressemblent (rare : changer le pseudo de salle).
