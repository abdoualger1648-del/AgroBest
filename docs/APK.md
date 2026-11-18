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
| absents | APK signé en « debug » — installable pour essayer, **à ne pas distribuer** |

La différence compte : une version signée en debug ne peut pas être remplacée plus tard par une
version signée avec votre clé. L'utilisateur devrait désinstaller, donc **tout perdre**.

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

## Installer l'APK sur un téléphone

Android refuse par défaut les applications hors boutique. À la première installation, le
téléphone propose d'autoriser la source (le gestionnaire de fichiers ou la messagerie utilisée) :
c'est une autorisation par application, et elle ne concerne qu'elle.
