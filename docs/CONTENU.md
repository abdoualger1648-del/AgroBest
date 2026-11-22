# Mettre à jour le contenu

Le contenu pédagogique vit dans `apps/agri28/content/`, **jamais dans `src/`**. Corriger une phrase,
ajouter une source, changer un outil : c'est un fichier JSON à éditer, pas du React à toucher.

Après **toute** modification, deux commandes, depuis la racine du dépôt :

```bash
npm run validate:content   # le contenu est-il conforme ?
npm run test               # rien n'est cassé ailleurs ?
```

La première refuse de laisser passer les erreurs décrites plus bas. Ce n'est pas une formalité :
elle utilise exactement les mêmes schémas que l'application, donc un contenu qu'elle accepte se
chargera forcément dans l'application (décision D20).

---

## Les fichiers

| Fichier | Contient |
|---|---|
| `content/days/day-NN.fr.json` et `day-NN.ar.json` | une journée, dans chaque langue |
| `content/tools.json` | les outils d'IA cités, leur disponibilité et sa date de vérification |
| `content/guardrails.json` | les neuf avertissements, écrits une seule fois |
| `content/sources.json` | les sources citées, avec leur date de consultation |
| `content/templates/templates.json` | les cinq modèles vierges de la bibliothèque |
| `content/wilayas.json` | les 69 wilayas |
| `content/test-niveau.json` | les questions du test de niveau, **les deux langues dans le même fichier** |

Le schéma complet d'une leçon est décrit dans [lesson-schema.md](lesson-schema.md), avec un exemple
commenté dans [examples/day-01.fr.sample.json](examples/day-01.fr.sample.json).

---

## Les cas courants

### Corriger une faute, reformuler une phrase

Ouvrez le JSON du jour concerné, changez le texte, lancez les deux commandes. C'est tout.

**N'oubliez pas l'autre langue.** Si vous corrigez un contresens dans `day-12.fr.json`, la phrase
arabe de `day-12.ar.json` dit probablement la même chose de travers.

### Ajouter une source

Deux endroits, dans cet ordre :

1. Dans `content/sources.json`, une entrée avec un `id`, le titre, l'URL, la date de consultation
   (`checkedOn`) et un niveau de confiance (`haute`, `moyenne`, `faible`).
2. Dans le jour concerné, l'`id` de la source dans son tableau `sources`.

Un niveau `faible` n'est pas une faute : c'est une information honnête. Il sert aux sources
secondaires concordantes dont on n'a pas pu consulter l'original.

### Ajouter ou mettre à jour un outil d'IA

Dans `content/tools.json`, chaque outil porte :

- `availabilityDZ` : `oui`, `non` ou `a_verifier` — **la disponibilité depuis l'Algérie**, pas
  l'existence de l'outil ;
- `checkedOn` : la date à laquelle vous l'avez vérifiée.

La validation **avertit** pour tout outil cité dont la disponibilité est `a_verifier`, et pour tout
outil vérifié il y a plus de six mois. Ces avertissements ne bloquent pas, mais ils sont là pour
être traités : un outil « vérifié » en 2026 ne l'est plus en 2027.

Un jour ne peut citer qu'un outil présent dans ce fichier : un identifiant inconnu est une erreur.

### Adapter une leçon à un type d'activité

Une leçon peut porter des **variantes** : l'exemple de terrain, les libellés de capture et les
indices de prompt changent selon l'activité (`apiculture`, `maraichage`…). Le reste — concepts,
quiz, gabarits de prompt — ne bouge pas.

```json
"variantes": {
  "apiculture": {
    "terrain": { "label": "Sur le terrain", "text": "Yacine conduit 40 ruches à Médéa…" },
    "captures": { "c1": "Combien de ruches conduisez-vous ?" },
    "indices": { "p1": "Si l'IA parle de pâturage au lieu de miellée, corrigez." }
  }
}
```

Un type sans variante lit le texte générique : une variante absente n'est jamais une page vide.
C'est d'ailleurs pourquoi **le type `ovin` n'a pas de variante** — le texte générique est déjà
écrit pour lui.

**Limite à connaître** : `terrain` remplace le bloc `example` du concept. Seuls les jours
1, 2, 4, 6, 7, 9, 14, 15, 17 et 19 en portent un. Sur les dix-huit autres, une variante de métier
ne peut changer que les libellés de capture et les indices de prompt.

Depuis la phase 15, une variante peut aussi **habiller une question de quiz** :

```json
"variantes": {
  "serre": {
    "questions": {
      "q1": {
        "text": "Énoncé réécrit pour la serre ?",
        "choices": { "b": "Tenir une production continue de novembre à avril…" },
        "explanation": "…"
      }
    }
  }
}
```

Les choix sont remplacés **par clé**. On ne peut donc ni en ajouter, ni en retirer, ni toucher
`answer` : la bonne réponse reste ancrée à son identifiant. On habille la question, on ne la
réécrit pas.

**Le gabarit d'un prompt n'est pas remplaçable**, et le schéma ne l'autorise même pas. C'est lui
qui porte les garde-fous, et il interpole déjà `{{project.type}}` : l'IA reçoit l'activité sans
qu'on réécrive rien.

#### Faire écrire une variante par Claude

```bash
ANTHROPIC_API_KEY=… npm run variantes -- --jour 7 --type apiculture
```

Le script écrit les deux langues **dans le même appel** — c'est ce qui garantit leur parité — puis
vérifie la réponse contre le schéma et contre les identifiants réels de la leçon avant d'écrire.

La variante est marquée `"brouillon": true`, et **l'application ne l'affiche pas** tant que ce
drapeau est là. Relisez les deux fichiers, corrigez ce qui sonne faux, retirez le drapeau dans les
**deux** langues, puis `npm run validate:content && npm run test`.

C'est l'écriture qui est automatisée, jamais la publication.

### Adapter une leçon au niveau de l'utilisateur

Second axe, indépendant du précédent : un apiculteur débutant reçoit la variante `apiculture`
**et** la variante `debutant`. Les deux s'appliquent l'une après l'autre.

```json
"variantesNiveau": {
  "debutant": {
    "aide": "Appuyez sur « Copier » : le texte part dans la mémoire du téléphone…"
  },
  "avance": {
    "defi": "Posez la même question à un troisième outil, puis cherchez où les trois se contredisent."
  }
}
```

- `aide` s'affiche **avant** les étapes : ce sont les gestes, pour quelqu'un qui n'a jamais
  utilisé d'outil d'IA. Elle n'explique jamais le métier d'agriculteur.
- `defi` s'affiche **après** les étapes : il suppose la pratique faite et demande un
  approfondissement réel, pas « recommencez en mieux ».
- `indices` fonctionne comme pour l'activité. En cas de conflit entre les deux axes sur un même
  indice, **c'est le niveau qui gagne** : le métier décide de quoi on parle, le niveau décide
  combien on accompagne.

Il n'y a **pas** de variante `intermediaire` : ce niveau *est* le parcours standard, et la
validation refuse une variante pour lui.

Ici encore, le gabarit d'un prompt n'est pas remplaçable, et le schéma ne l'expose pas.

```bash
ANTHROPIC_API_KEY=… npm run variantes -- --jour 7 --niveau debutant
```

Même script, même garantie de parité, même drapeau `"brouillon": true` à retirer après relecture.
Un seul axe par appel : `--type` ou `--niveau`, jamais les deux.

#### Publier une variante que vous venez de relire

Les jours 8 à 28 sont déjà écrits, **en brouillon** : l'application les ignore. Après avoir lu une
semaine, levez son drapeau d'une commande plutôt qu'à la main :

```bash
npm run variantes:valider -- --jours 8-14 --niveau tous
npx prettier --write 'content/days/day-*.json'
npm run validate:content && npm run test
```

Les jours se nomment toujours explicitement : il n'existe **pas** de « tout valider ». Ce serait
le tampon que le drapeau cherche justement à éviter. La commande ne touche qu'un seul axe à la
fois : valider les niveaux ne publie jamais au passage une variante de métier que personne n'a lue.

### Changer les questions du test de niveau

`content/test-niveau.json` porte les questions, leurs options et leurs **points**. Les deux
langues sont côte à côte : il n'y a pas deux fichiers à tenir synchronisés.

Trois axes, et chacun doit porter au moins une question : `ia` (aisance avec les outils),
`maturite` (où en est le projet), `gestion` (ce qui est déjà suivi).

Le barème vit dans ce fichier, pas dans le code : rendre un axe plus ou moins sévère se fait en
changeant des `points`. Les seuils, eux, sont dans `src/domain/niveau.ts`.

Deux règles que la validation impose : une question dont toutes les options valent le même nombre
de points est refusée — elle allonge le test sans rien mesurer — et chaque question doit être
traduite en arabe, avec des chiffres occidentaux (D44).

**À savoir avant de toucher au barème** : l'aisance avec l'IA fixe un plafond. Un projet déjà en
production et un suivi bien tenu peuvent relever le niveau d'un cran, jamais le faire monter
depuis zéro. Quelqu'un qui n'a jamais ouvert un assistant reste débutant, quelle que soit la tenue
de ses comptes — parce que c'est le niveau qui décide s'il reçoit le prompt tout écrit.

### Ajouter un jour

Utilisez le générateur `apps/agri28/scripts/authoring/emit.py`, qui écrit les deux langues côte à
côte à partir d'une description unique. La parité est alors garantie par construction, au lieu
d'être vérifiée après coup. Son mode d'emploi est dans
[`scripts/authoring/README.md`](../apps/agri28/scripts/authoring/README.md).

**Le générateur ne sert qu'à la première écriture.** Une fois le jour créé, les deux JSON sont la
source de vérité : on les corrige directement, on ne régénère jamais, sous peine d'écraser les
corrections.

### Changer un garde-fou

`content/guardrails.json` les contient une seule fois ; les leçons n'en citent que l'identifiant.
Modifier le texte à cet endroit le change partout, y compris dans les exports Word et tableur.

---

## Ce que la validation refuse

Ces règles existent parce qu'elles protègent l'utilisateur final, pas pour faire joli.

| Règle | Pourquoi |
|---|---|
| **Un montant en DA sans source datée** | un prix sans date et sans origine est une invention, et l'utilisateur engagera son argent dessus |
| **Un texte réglementaire cité sans source datée** | « le décret n° 23-15 fixe… » doit pouvoir être vérifié. Une phrase qui *interdit* de citer un décret (« n'invente aucun texte ») est bien sûr acceptée |
| **Une balise HTML dans le contenu** | le contenu est du texte, pas du gabarit |
| **Un lien en `http://`, ou une URL raccourcie** | on ne demande pas à quelqu'un de cliquer sur une destination qu'il ne peut pas lire |
| **Un outil ou un garde-fou inconnu** | un identifiant qui ne correspond à rien s'afficherait vide |
| **Une variable de prompt inconnue** | `{{project.nom}}` au lieu de `{{project.name}}` partirait vide dans le prompt |
| **Un fichier annoncé en arabe sans un seul caractère arabe** | attrape le copier-coller du français dans le fichier arabe |
| **Une parité AR/FR rompue** | voir ci-dessous |

### Les variables de prompt autorisées

`{{project.name}}` · `{{project.type}}` · `{{project.scale}}` · `{{project.area}}` ·
`{{project.wilaya}}` · `{{project.commune}}` · `{{project.objective}}` · `{{project.horizonMonths}}` ·
`{{project.budgetCeiling}}` · `{{project.waterSource}}` · `{{project.startMonth}}` ·
`{{today}}` · `{{lang}}`

### La parité AR/FR

Les deux versions d'un jour doivent avoir **la même ossature**, seuls les textes diffèrent. La
validation compare, identifiant par identifiant : les étapes de la pratique, les prompts, les
captures, les questions du quiz et leurs choix, les outils, les garde-fous, le type de brique
produite et le fait d'exiger un projet.

Autrement dit : ajouter une quatrième question au quiz français sans l'ajouter à l'arabe est une
erreur, pas un oubli silencieux.

---

## Et les prix ?

Il n'y en a aucun dans le contenu, et c'est délibéré (décision D25). Aucune source publique
algérienne fiable et à jour n'a pu être trouvée pour les prix agricoles. Un montant écrit
aujourd'hui serait faux dans six mois, et l'utilisateur le croirait.

Le parcours fait donc l'inverse : l'IA dresse la **liste des postes** à chiffrer, et l'utilisateur
relève ses propres prix, les date et les compare. Les circuits officiels (CCLS pour l'orge
subventionnée, ONAB pour le son) sont cités sans montant, avec leur source.

Si vous ajoutez malgré tout un prix, la validation exigera une source datée. Demandez-vous alors
s'il sera encore juste dans six mois — et si la réponse est non, écrivez plutôt comment le relever.
