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
