# L'application Android (APK)

L'APK se partage de la main à la main : WhatsApp, Bluetooth, carte mémoire. Il ne passe par
aucune boutique. L'application web y est **embarquée** : elle fonctionne dès le premier
lancement, sans réseau et sans hébergement.

![L'écran d'entrée de l'APK](images/apk-accueil.png)

En édition APK, un compte est obligatoire, les trois premières leçons sont offertes, et la
suite demande une activation (voir [`../firebase/README.md`](../firebase/README.md)).

---

## Construire l'APK

Onglet **Actions** du dépôt → workflow **APK** → *Run workflow*, en indiquant le numéro de
version (par exemple `1.0.0`). Le fichier est attaché à l'exécution, dans **Artifacts**.

Le workflow refait d'abord `npm run verify` : rien ne part dans un APK sans que les types, le
lint, le contenu et les tests soient passés.

> Le bouton *Run workflow* n'apparaît qu'une fois le fichier `.github/workflows/apk.yml`
> présent sur la branche par défaut (`master`).

## Signer l'APK

Un APK doit être signé pour s'installer. Le workflow fonctionne dans les deux cas et **dit
lequel s'applique**, dans le résumé de l'exécution :

| Secrets de signature | Résultat |
|---|---|
| présents | APK signé avec votre clé — **distribuable**, et remplaçable par une mise à jour |
| absents | le build **échoue**, sauf si vous cochez « autoriser_debug » au lancement |

La différence compte : une version signée en debug ne peut pas être remplacée plus tard par une
version signée avec votre clé. L'utilisateur devrait désinstaller, donc **tout perdre**. C'est
pourquoi le workflow refuse désormais de produire un APK de debug sans qu'on le lui demande
explicitement — la case existe pour un essai, pas pour une distribution.

Le résumé d'un build signé affiche l'**empreinte du certificat** (SHA-1 et SHA-256). C'est elle,
et non le numéro de version, qui décide si une mise à jour s'installera par-dessus la précédente.
Gardez-la sous les yeux : la même empreinte d'une version à l'autre, et rien à désinstaller.

### Créer le magasin de clés

Sur une machine disposant de Java (`keytool` est fourni avec le JDK) :

```bash
keytool -genkeypair -v \
  -keystore agricole360.jks \
  -alias agricole360 \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -storetype PKCS12
```

L'outil demande un mot de passe et quelques informations (nom, organisation, pays : `DZ`).

**Gardez ce fichier et ce mot de passe hors ligne, en lieu sûr.** Si vous les perdez, vous ne
pourrez plus jamais publier de mise à jour installable par-dessus l'ancienne version. Il n'y a
aucun recours : c'est la clé qui prouve à Android que la mise à jour vient bien de vous.

### Déposer les secrets

Encoder le magasin en base64 :

```bash
base64 -w 0 agricole360.jks > agricole360.b64   # macOS : base64 -i agricole360.jks -o agricole360.b64
```

Puis, dans **Settings → Secrets and variables → Actions → New repository secret** :

| Secret | Contenu |
|---|---|
| `APK_KEYSTORE_BASE64` | le contenu de `agricole360.b64` |
| `APK_KEYSTORE_PASSWORD` | le mot de passe du magasin |
| `APK_KEY_ALIAS` | `agricole360` |
| `APK_KEY_PASSWORD` | le mot de passe de la clé (le même, sauf choix contraire) |
| `VITE_EMAIL_ADMIN` | l'adresse qui reçoit les demandes d'activation |

Le workflow efface la clé du serveur après l'assemblage, même en cas d'échec.

---

## Travailler sur l'APK en local

```bash
npm run apk:web        # build web en édition APK, puis copie dans le projet Android
```

Dans `apps/agri28` :

```bash
npm run apk:verifier   # sert les fichiers comme Capacitor et vérifie le comportement
npm run icons:android  # régénère icônes et écran de démarrage
```

`apk:verifier` ne remplace pas un essai sur téléphone, mais il attrape ce qui casse le plus
souvent dans un APK : un chemin de base resté sur `/AgroBest/`, un service worker encore actif,
un appel réseau au démarrage, ou le verrou de compte qui ne s'applique pas.

Assembler l'APK demande le SDK Android ; c'est le rôle de GitHub Actions.

## Ce que l'édition APK change

| | Site web | APK |
|---|---|---|
| Chemin de base | `/AgroBest/` | `/` |
| Service worker | oui | **non** — les fichiers sont déjà locaux |
| Cartes de source | oui | **non** — elles pèsent plus que le code |
| Compte | aucun | obligatoire, essai sur 3 leçons |

## Mettre à jour sans rien perdre

Android installe une nouvelle version **par-dessus** l'ancienne, en conservant toutes les données
de l'application — donc le Dossier, la progression, les prompts et le compte — à trois conditions,
toutes les trois réunies :

1. **même identifiant de paquet** : `dz.agricole360.app`. Il est écrit dans le dépôt et ne change
   pas.
2. **même clé de signature**, c'est-à-dire la même empreinte de certificat. C'est la seule des
   trois qui peut être cassée par erreur : changer de magasin de clés, ou passer d'un APK de debug
   à un APK signé, rend la mise à jour impossible. Android répond alors « application non
   installée », et la seule issue est de désinstaller — ce qui efface tout.
3. **`versionCode` croissant**. Le workflow le prend sur `github.run_number`, qui ne redescend
   jamais : cette condition est tenue d'office.

Dit autrement : **la clé de signature se choisit une fois et ne change plus jamais.** La perdre
interdit toute mise à jour future. Sauvegardez le fichier `.jks` et ses deux mots de passe hors de
GitHub.

Côté base de données, rien à faire : la base locale se met à jour toute seule depuis n'importe
quelle version passée du schéma, et deux tests l'éprouvent sur de vraies bases
(`src/db/migration-chaine.test.ts` depuis le tout premier schéma, `src/db/migration5.test.ts`
pour le dernier saut). L'édition APK n'embarque par ailleurs aucun service worker (D61) : il n'y a
donc pas de cache à vider après une mise à jour.

### Si vos utilisateurs ont déjà un APK de debug

Les versions distribuées avant la mise en place des secrets de signature sont signées en debug.
Le premier APK signé avec votre clé **ne pourra pas** s'installer par-dessus : c'est une rupture
unique, inévitable, et elle ne se reproduira plus ensuite. Prévenez-les, et dites-leur
d'exporter leurs données avant de désinstaller — **Paramètres → Mes données → « Exporter une
sauvegarde (.json) »** — puis de les restaurer après, par « Restaurer une sauvegarde ». La
restauration remet le profil à niveau au passage, quelle que soit la version d'origine (D109).

## Installer l'APK sur un téléphone

Android refuse par défaut les applications hors boutique. À la première installation, le
téléphone propose d'autoriser la source (le gestionnaire de fichiers ou la messagerie utilisée) :
c'est une autorisation par application, et elle ne concerne qu'elle.
