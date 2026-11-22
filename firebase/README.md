# Firebase — mise en service

Projet : **agricole360-4a470**. Firebase ne sert qu'au **compte et à son activation**
(adresse email, état, dates). Le projet de l'utilisateur, ses réponses, ses prompts et son
Dossier restent sur son téléphone et ne sont jamais envoyés (décision D48).

## 1. Activer les deux services

Dans la [console Firebase](https://console.firebase.google.com/), projet `agricole360-4a470` :

1. **Authentication** → *Sign-in method* → **E-mail/Mot de passe** → activer.
   Laisser « Lien de connexion sans mot de passe » désactivé.
2. **Firestore Database** → *Créer une base de données* → **mode production**
   (les règles ci-dessous remplaceront celles par défaut) → région au choix.

> **Les règles ont changé en phase 9** (niveau multi-dossiers). Si votre projet tourne déjà,
> republiez-les : sans cela, personne ne pourra demander le niveau supérieur, ni se le voir
> accorder. L'application continue de fonctionner pour tout le reste.

## 2. Publier les règles de sécurité

Copier le contenu de [`firestore.rules`](firestore.rules) dans
**Firestore Database → Règles**, puis *Publier*.

**Ne pas sauter cette étape.** Sans ces règles, en mode production Firestore refuse tout, et
l'application ne fonctionnera pas ; en mode test, n'importe qui pourrait s'activer lui-même.

La clé d'API présente dans le code n'est pas un secret : Google la publie dans toutes les
applications web et elle ne fait qu'identifier le projet. **La protection, ce sont ces règles.**

## 3. Se désigner comme administrateur

L'administrateur n'est pas écrit dans le code : il est désigné par un document dans Firestore.
Aucune adresse personnelle ne figure donc dans ce dépôt public.

1. Créer son compte **depuis l'application** (écran « Votre compte »), et confirmer l'adresse.
2. Dans la console, **Authentication → Users**, copier l'**UID** de ce compte.
3. Dans **Firestore Database → Données**, créer la collection `admins`, puis un document dont
   l'**identifiant est cet UID**. Son contenu n'a aucune importance ; un champ `nom` suffit.

L'écran **Administration** apparaît alors dans l'application, pour ce compte uniquement.

## 4. Vérifier que la protection tient

À faire une fois, depuis un compte **non** administrateur :

- Dans la console, **Firestore → Données**, ouvrir sa propre ligne `utilisateurs/{uid}` et
  tenter de passer `actif` à `true` **depuis l'application** — c'est impossible, aucun écran ne
  le propose, et les règles le refuseraient.
- L'écran Administration ne doit pas apparaître.

## Les messages envoyés par Firebase

Firebase envoie lui-même deux messages, sans aucun réglage ni coût :

| Message | Déclenché par |
|---|---|
| Confirmation de l'adresse | la création d'un compte, et le bouton « Renvoyer le message » |
| Réinitialisation du mot de passe | le lien « Mot de passe oublié ? » de l'écran de connexion |

Leur texte se modifie dans **Authentication → Templates**, y compris la langue.

Le seul message que Firebase n'enverra pas gratuitement est celui qui **vous** prévient d'une
demande d'activation : c'est pourquoi la demande est enregistrée dans Firestore et visible dans
l'écran Administration (décision D49).

## Ce qui est stocké, et rien d'autre

| Champ | Contenu |
|---|---|
| `email` | l'adresse du compte |
| `creeLe` | date de création |
| `actif` | activé ou non — **écrit par l'administrateur seul** |
| `demandeLe` | date de la demande d'activation |
| `activeLe` | date de l'activation |
| `niveau` | `standard` (un dossier) ou `multi` (cinq) — **écrit par l'administrateur seul** |
| `demandeNiveauLe` | date de la demande de passage au niveau supérieur |
| `niveauLe` | date à laquelle le niveau a été accordé |

## Republier les règles après une mise à jour

`firestore.rules` évolue avec l'application. À chaque changement, il faut **recoller le fichier**
dans [la console Firestore](https://console.firebase.google.com/project/agricole360-4a470/firestore/rules)
et publier : les règles déployées ne se mettent pas à jour toutes seules depuis le dépôt.

Deux changements attendent aujourd'hui une republication :

| Phase | Ce qui a changé | Sans republication |
|---|---|---|
| 9 | `niveau`, `niveauLe`, `demandeNiveauLe` | accorder le niveau multi-dossiers échoue |
| 13 | `desactiveLe` ajouté aux champs que l'administrateur peut écrire | fermer un accès échoue |

Les autres actions (lister, activer, accorder le niveau) fonctionnent déjà avec les règles de la
phase 9.


## Activer Google et Facebook (phase 14)

Les boutons « Continuer avec… » n'apparaissent que sur le **site web**. Dans l'APK ils sont
volontairement absents : Google refuse l'OAuth depuis une WebView embarquée, et le bouton
échouerait sur un message incompréhensible. Le chemin natif reste à faire.

### Google — quelques minutes

1. [Console → Authentication → Sign-in method](https://console.firebase.google.com/project/agricole360-4a470/authentication/providers)
2. **Google** → *Activer* → choisissez une adresse d'assistance → *Enregistrer*.
3. Onglet **Settings → Authorized domains** : vérifiez que `abdoualger1648-del.github.io`
   y figure. Sans lui, la connexion échoue avec « unauthorized-domain », que
   l'application traduit par « cette façon de se connecter n'est pas disponible ici ».

C'est tout. Aucun compte développeur, aucune revue.

### Facebook — plus long, mais sans revue d'application

1. Créez une application sur [developers.facebook.com](https://developers.facebook.com/apps/),
   de type **Consumer**. Ce type reçoit automatiquement l'accès avancé à `email` et
   `public_profile` : **aucune revue n'est nécessaire** pour ces deux permissions, et
   l'application n'en demande pas d'autres.
2. Ajoutez le produit **Facebook Login**.
3. Dans la console Firebase, activez **Facebook** et collez l'**App ID** et l'**App Secret**.
4. Firebase affiche alors une **URI de redirection OAuth**. Copiez-la dans votre application
   Facebook, sous *Facebook Login → Settings → Valid OAuth Redirect URIs*.
5. Passez l'application Facebook en **mode Live**. Tant qu'elle est en développement, seuls
   vous et les testeurs déclarés peuvent s'en servir.
6. Facebook exige une **adresse de politique de confidentialité** publique. Celle du site
   convient : `https://abdoualger1648-del.github.io/AgroBest/`.

### Ce que l'application demande, et rien d'autre

Uniquement l'adresse email. Ni les contacts, ni les amis, ni le profil étendu. Le texte de
l'écran de compte le dit, dans les deux langues, et il dit aussi que le fournisseur apprend
que la personne utilise l'application — ce qui est le prix de la connexion en un geste.

### À republier : les règles

La règle de création tolère désormais un jeton **sans adresse email**. Facebook n'en renvoie
aucune si la personne s'est inscrite chez lui avec un numéro de téléphone. Sans cette
tolérance, la création du compte serait refusée sans que rien ne dise pourquoi.

### Ce qui reste hors d'atteinte

| Demandé | Pourquoi ce n'est pas fait |
|---|---|
| WhatsApp | Aucun fournisseur OAuth WhatsApp n'existe. L'entreprise authentifie ses propres utilisateurs mais ne délègue rien. |
| X (Twitter) | Firebase le propose encore, mais l'accès développeur X est payant depuis 2023, pour un public qui n'utilise pas X. |
| Numéro de téléphone | Firebase n'envoie plus de SMS sans compte de facturation depuis septembre 2024. Le plan Spark en est incapable. À rouvrir le jour où un plan Blaze existe. |
