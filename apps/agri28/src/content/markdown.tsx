import type { ReactNode } from 'react';

/**
 * Markdown restreint : **gras**, *italique*, `code`, [lien](https://…) et
 * retours à la ligne. Aucun HTML brut n'est interprété — le contenu est
 * rendu en nœuds React, jamais injecté dans le DOM.
 */
const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\((?:https:\/\/|\/)[^)\s]+\))/g;

export function renderInline(text: string, keyPrefix = ''): ReactNode[] {
  const nodes: ReactNode[] = [];
  let index = 0;

  for (const part of text.split(TOKEN)) {
    if (!part) continue;
    const key = `${keyPrefix}-${index++}`;

    if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push(<strong key={key}>{part.slice(2, -2)}</strong>);
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      nodes.push(<em key={key}>{part.slice(1, -1)}</em>);
    } else if (part.startsWith('`') && part.endsWith('`')) {
      nodes.push(
        <code key={key} className="rounded bg-surface-2 px-1 py-0.5 text-[0.9em]">
          {part.slice(1, -1)}
        </code>,
      );
    } else {
      const link = /^\[([^\]]+)\]\(((?:https:\/\/|\/)[^)\s]+)\)$/.exec(part);
      if (link) {
        const [, label = '', href = ''] = link;
        nodes.push(
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline"
          >
            {label}
          </a>,
        );
      } else {
        nodes.push(part);
      }
    }
  }

  return nodes;
}

/** Texte brut équivalent : utilisé pour le Dossier et les exports. */
export function toPlainText(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}
