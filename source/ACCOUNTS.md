# Comptes des joueurs : mise en service

Les joueurs ont maintenant de vrais comptes (Supabase Auth : e-mail + mot de passe). Un compte peut avoir **plusieurs joueurs**
(ex. PATOU, LOUIS, LÉONIE sur le compte de Benjamin). Le mot de passe du site (commun à la bande) reste exigé en plus.
Chaque salle peut aussi donner à un joueur un **pseudo de salle** (affiché seulement dans cette salle).

## Ordre conseillé

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

- **Site URL** : `https://gt40benjamin.github.io/jdv/`
- **Redirect URLs** (ajouter les deux) :
  - `https://gt40benjamin.github.io/jdv/`
  - `https://gt40benjamin.github.io/jdv/**`

Le site envoie `redirect_to` = sa propre adresse. Les liens des e-mails s'ouvrent dans le **navigateur** du téléphone (pas dans l'appli
Android) : on y tape le mot de passe du site, puis l'écran « Choisis ton nouveau mot de passe » (ou « E-mail confirmé ») apparaît.
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

- **Nouvel appareil** : « Nouveau joueur » (pseudo + tête + cri + e-mail + mot de passe ; ou « sans compte » pour un enfant) |
  « J'ai déjà un compte » (**e-mail ou pseudo** + mot de passe ; avec l'e-mail et plusieurs joueurs sur le compte : « qui joue ? »).
  Un pseudo protégé tapé dans « Nouveau joueur » : « REMS a un compte : connecte-toi ».
- **Appareil déjà connecté** : un nouveau joueur est rattaché au compte de l'appareil (choix si plusieurs comptes, ou « Nouveau compte »).
  « Qui joue ? » montre les « Joueurs de mon compte » à ajouter sur l'appareil.
- **Joueurs existants** (passage obligatoire) : au retour, fenêtre « Protège ton pseudo » qu'on ne peut pas fermer : pseudo à confirmer
  (ou changer), e-mail + mot de passe, et « Ajouter aussi LOUIS et LÉONIE à ce compte » pour les autres joueurs de l'appareil. Sorties :
  « J'ai déjà un compte », « Ce profil reste sur cet appareil, sans compte » (enfant, confirmé en 2 touches), « Changer de joueur ».
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
- **Connexion par pseudo** : `login_email` renvoie l'e-mail du compte à quiconque a le mot de passe du site (il n'est jamais affiché, mais
  visible dans les outils du navigateur). Limité à 10 essais par pseudo et 60 en tout par 10 minutes. Supabase limite en plus les
  essais de mot de passe.
- **Profils « sans compte »** (enfants) : leur pseudo n'est pas protégé ; s'il est protégé ailleurs plus tard, l'appareil devra se connecter
  ou changer de pseudo.
- **E-mail pas encore confirmé** : le pseudo reste non protégé jusqu'au clic sur le lien (bannière de rappel, pas de blocage).
- **Jetons** gardés dans le stockage local de l'appareil (comme le fait Supabase lui-même) ; rafraîchis automatiquement ;
  « Se déconnecter » les révoque.
- Certains antivirus de messagerie ouvrent les liens tout seuls : le lien peut alors être « déjà utilisé » → redemander un e-mail.
- **Pseudo de salle** : unique dans la salle au moment où on le choisit ; si un nouveau membre arrive avec un pseudo principal égal au pseudo
  de salle d'un autre, les deux noms se ressemblent (rare : changer le pseudo de salle).
