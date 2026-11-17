"""Génère les deux fichiers de leçon (FR et AR) à partir d'une description unique.

Chaque chaîne bilingue est un T("français", "arabe") : la structure, les
identifiants et le nombre d'éléments sont donc identiques par construction,
ce qui rend la parité AR/FR impossible à casser par inattention.
"""
import json
import pathlib


class T:
    def __init__(self, fr, ar):
        self.fr = fr
        self.ar = ar


def pick(node, lang):
    if isinstance(node, T):
        return getattr(node, lang)
    if isinstance(node, dict):
        return {key: pick(value, lang) for key, value in node.items()}
    if isinstance(node, list):
        return [pick(value, lang) for value in node]
    return node


def write(spec, out_dir):
    out = pathlib.Path(out_dir)
    for lang in ('fr', 'ar'):
        data = pick(spec, lang)
        data['lang'] = lang
        ordered = {}
        for key in ('schema', 'id', 'day', 'week', 'lang'):
            ordered[key] = data.pop(key)
        ordered.update(data)
        path = out / f"{ordered['id']}.{lang}.json"
        path.write_text(json.dumps(ordered, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print('écrit', path)
