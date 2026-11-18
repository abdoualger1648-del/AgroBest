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
