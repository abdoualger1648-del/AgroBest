# Mise en service — pas à pas

Tout ce qui reste à faire pour que l'application vive : les réglages GitHub, les règles
Firestore, le premier APK et votre compte administrateur.

**Comptez une heure la première fois.** Chaque étape dit ce que vous devez voir quand elle a
réussi — si vous ne le voyez pas, arrêtez-vous là plutôt que de continuer.

> Les libellés exacts des consoles Google et GitHub changent régulièrement. Les adresses
> directes, elles, sont stables : suivez-les plutôt que de chercher dans les menus.

## Déjà fait

| | État |
|---|---|
| Projet Firebase `agricole360-4a470` | créé |
| Authentication → E-mail/Mot de passe | **activé** (vérifié) |
| Base Firestore | **créée**, et fermée aux visiteurs non connectés (vérifié) |

---

## Étape 1 — Autoriser GitHub Pages à publier (2 min)

Ouvrez **https://github.com/abdoualger1648-del/WinBest/settings/pages**

Sous *Build and deployment*, dans la liste **Source**, choisissez **GitHub Actions**.
Il n'y a rien à enregistrer : le choix s'applique immédiatement.

**Vous devez voir** : la mention d'une source « GitHub Actions », et plus de liste de branche.

À faire **avant** l'étape 4 : sans ce réglage, la première publication échouera sur une erreur
de permission.

---

## Étape 2 — Publier les règles de sécurité Firestore (3 min)

**C'est l'étape la plus importante du document.** Sans elle, personne ne peut créer de compte,
et en mode permissif n'importe qui pourrait s'activer soi-même.

1. Ouvrez le fichier [`firebase/firestore.rules`](../firebase/firestore.rules) et copiez
   **tout** son contenu.
2. Ouvrez **https://console.firebase.google.com/project/agricole360-4a470/firestore/rules**
3. Effacez ce qui s'y trouve, collez le contenu copié, puis **Publier**.

**Vous devez voir** : « Dernière publication » avec la date du jour, et aucun avertissement
rouge dans l'éditeur.

### Ce que ces règles font, en une phrase

Un utilisateur peut lire sa propre ligne et écrire la date de sa demande, mais **jamais** son
champ `actif` : seul un compte administrateur l'écrit. C'est tout le modèle d'activation.

---

## Étape 3 — Créer la clé de signature de l'APK (5 min)

Un APK doit être signé pour s'installer. **Faites-le maintenant, pas plus tard** : un APK signé
en « debug » ne peut jamais être remplacé par une version signée — vos utilisateurs devraient
désinstaller, donc tout perdre.

Sur une machine avec Java (`keytool` vient avec le JDK) :

```bash
keytool -genkeypair -v \
  -keystore agricole360.jks \
  -alias agricole360 \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -storetype PKCS12
```

L'outil demande un mot de passe, puis votre nom, votre organisation et le pays (`DZ`).

> **Pas de Java sous la main ?** Dites-le-moi : je peux engendrer le fichier et vous le
> transmettre. Sachez seulement que la clé aura alors transité par notre session.

**Sauvegardez `agricole360.jks` et son mot de passe hors ligne.** Les perdre, c'est ne plus
jamais pouvoir mettre à jour l'application chez ceux qui l'ont installée. Il n'y a aucun recours.

### Déposer la clé dans GitHub

Encodez le fichier :

```bash
base64 -w 0 agricole360.jks > agricole360.b64     # macOS : base64 -i agricole360.jks -o agricole360.b64
```

Ouvrez **https://github.com/abdoualger1648-del/WinBest/settings/secrets/actions** et créez,
avec *New repository secret*, ces cinq secrets :

| Nom | Valeur |
|---|---|
| `APK_KEYSTORE_BASE64` | tout le contenu de `agricole360.b64` |
| `APK_KEYSTORE_PASSWORD` | le mot de passe du magasin |
| `APK_KEY_ALIAS` | `agricole360` |
| `APK_KEY_PASSWORD` | le mot de passe de la clé (le même, sauf si vous en avez choisi un autre) |
| `VITE_EMAIL_ADMIN` | l'adresse qui recevra les demandes d'activation |

**Vous devez voir** : cinq secrets listés. Leur valeur n'est plus affichable — c'est normal.

---

## Étape 4 — Fusionner dans `master` (5 min)

C'est ce qui débloque le reste : le site se publie, et le bouton de construction de l'APK
apparaît. GitHub ne propose ces deux choses que pour la branche par défaut.

Ouvrez **https://github.com/abdoualger1648-del/WinBest/compare/master...claude/28-days-ai-agriculture-3ga039**

1. *Create pull request* → donnez un titre → *Create pull request*.
2. Attendez que la vérification (CI) passe au vert : environ 5 minutes.
3. *Merge pull request* → *Confirm merge*.

**Vous devez voir**, quelques minutes après la fusion, une exécution réussie du workflow
*Déploiement* dans **https://github.com/abdoualger1648-del/WinBest/actions**, et le site à
l'adresse **https://abdoualger1648-del.github.io/WinBest/**

Ce site est la **vitrine** : les trois premières leçons, sans compte. C'est voulu — publier les
28 leçons dans un navigateur viderait de son sens l'activation.

### Si la publication échoue

- *« Resource not accessible »* ou une erreur de permission → l'étape 1 n'a pas été faite.
- La CI échoue avant → ouvrez l'exécution, lisez l'étape en rouge, et envoyez-moi le message.

---

## Étape 5 — Construire le premier APK (10 min)

Ouvrez **https://github.com/abdoualger1648-del/WinBest/actions/workflows/apk.yml**

*Run workflow* → branche `master` → version `1.0.0` → *Run workflow*.

**Vous devez voir**, au bout de 5 à 10 minutes, une exécution verte. Ouvrez-la : le résumé dit
`Signature : clé de release. Distribuable.` Si vous lisez `Signature : debug`, l'étape 3 n'a pas
abouti — ne distribuez pas ce fichier.

Le fichier est en bas de la page, sous **Artifacts** : `agricole-dz-360-1.0.0.apk`. Il est dans
une archive `.zip` ; ouvrez-la pour en sortir l'APK.

> C'est le premier assemblage Android du projet. Si Gradle échoue, envoyez-moi l'étape en rouge :
> c'est le seul morceau que je n'ai pas pu exécuter ici.

---

## Étape 6 — Installer et créer votre compte (10 min)

Transférez l'APK sur votre téléphone (messagerie, câble, Drive) et ouvrez-le.

Android demandera l'autorisation d'installer une application hors boutique : l'autorisation ne
concerne que l'application d'où vous ouvrez le fichier.

Dans l'application :

1. Écran **Votre compte** → *Créer un compte* → votre adresse et un mot de passe.
2. Ouvrez l'email reçu, cliquez sur le lien de confirmation.
3. Revenez dans l'application → *J'ai confirmé, vérifier*.

**Vous devez voir** l'écran d'accueil du parcours, avec le bandeau « Accès d'essai ».

### Si ça bloque ici

- *« Pas de connexion »* alors que vous avez du réseau → l'étape 2 n'a pas été faite : Firestore
  refuse l'écriture.
- L'email n'arrive pas → regardez les indésirables ; sinon *Renvoyer le message*.

---

## Étape 7 — Vous désigner administrateur (5 min)

L'administrateur n'est écrit nulle part dans le code : il est désigné par un document dans la
base. C'est ce qui évite d'inscrire votre adresse dans un dépôt public.

1. Ouvrez **https://console.firebase.google.com/project/agricole360-4a470/authentication/users**
   et copiez l'**UID** de votre compte (une longue suite de lettres et de chiffres).
2. Ouvrez **https://console.firebase.google.com/project/agricole360-4a470/firestore/data**
3. *Démarrer une collection* → identifiant **`admins`**.
4. Pour l'identifiant du document, **collez votre UID** (n'utilisez pas « ID automatique »).
5. Ajoutez un champ quelconque, par exemple `nom` (chaîne) = `administrateur`, puis *Enregistrer*.

**Vous devez voir**, dans l'application, un lien **Administration** dans l'onglet *Plus*.
Fermez et rouvrez l'application s'il n'apparaît pas tout de suite.

---

## Étape 8 — Publier l'APK et l'offrir au téléchargement (10 min)

Pour l'instant, le site dit « Aucune version n'est encore publiée ».

1. Ouvrez **https://github.com/abdoualger1648-del/WinBest/releases/new**
2. *Choose a tag* → tapez `v1.0.0` → *Create new tag*.
3. Donnez un titre, glissez le fichier `.apk` dans la zone de pièces jointes, puis
   *Publish release*.
4. Faites un clic droit sur le fichier attaché → *Copier l'adresse du lien*.
5. Ouvrez **https://github.com/abdoualger1648-del/WinBest/settings/variables/actions** →
   *New repository variable* → nom `URL_APK`, valeur : l'adresse copiée.
6. Relancez le workflow *Déploiement* depuis l'onglet Actions.

**Vous devez voir**, sur le site, un bouton **Télécharger l'application** à la place du message.

---

## Vérifier que la protection tient

À faire une fois, depuis un téléphone ou un compte **qui n'est pas** administrateur :

- L'onglet *Plus* ne doit **pas** montrer « Administration ».
- La leçon 4 doit demander une activation.
- Sur le site public, la leçon 4 doit renvoyer vers le téléchargement.

Si l'un de ces trois points ne se comporte pas ainsi, dites-le-moi : c'est que quelque chose
dans les règles n'a pas pris.

---

## Ensuite, au quotidien

**Activer un utilisateur** : il vous écrit depuis l'application ; vous ouvrez *Plus →
Administration*, vous le trouvez dans la liste, vous appuyez sur *Activer*. Il rouvre
l'application connecté à internet, et ses 28 leçons s'ouvrent.

**Publier une mise à jour** : relancez le workflow APK avec un numéro de version supérieur,
attachez le nouveau fichier à une nouvelle *release*, et mettez `URL_APK` à jour. Vos
utilisateurs installent le nouvel APK par-dessus l'ancien — **à condition qu'il soit signé avec
la même clé**.

**Corriger le contenu** : voir [CONTENU.md](CONTENU.md). Aucune ligne de React à toucher.
