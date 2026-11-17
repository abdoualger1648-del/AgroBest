# Aide à la rédaction d'une leçon

`emit.py` sert à **créer** la paire de fichiers d'un nouveau jour (`day-NN.fr.json`
et `day-NN.ar.json`) à partir d'une description unique où chaque chaîne est écrite
dans les deux langues côte à côte :

```python
from emit import T, write

spec = {
  "schema": 1, "id": "day-08", "day": 8, "week": 2, "lang": "fr",
  "title": T("Titre français", "العنوان بالعربية"),
  # …
}
write(spec, 'content/days')
```

La structure, les identifiants et le nombre d'éléments sont donc identiques par
construction : la parité AR/FR ne peut pas être cassée par inattention.

**Les fichiers JSON de `content/days/` restent la source de vérité.** Une fois un
jour écrit, on le corrige directement dans son JSON — on ne régénère pas, sous
peine d'écraser les corrections. Cet outil ne sert qu'à la première écriture.

Après toute modification : `npm run validate:content` puis `npm run test`.
