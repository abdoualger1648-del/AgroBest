import type { DossierBlock } from '@/domain/types';

/** Affiche les briques du Dossier (représentation neutre, décision D7). */
export function DossierBlocks({ blocks }: { blocks: readonly DossierBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'heading':
            return (
              <h4 key={index} className="mt-3 mb-1 font-semibold first:mt-0">
                {block.text}
              </h4>
            );
          case 'paragraph':
            return (
              <p key={index} className="mb-2 whitespace-pre-wrap last:mb-0">
                {block.text}
              </p>
            );
          case 'note':
            return (
              <p
                key={index}
                className={`mb-2 rounded-xl border p-2 text-sm last:mb-0 ${
                  block.variant === 'warning'
                    ? 'border-warning/50 bg-warning/10'
                    : 'border-primary/40 bg-primary/5'
                }`}
              >
                {block.text}
              </p>
            );
          case 'list':
            return (
              <ul key={index} className="mb-2 list-disc space-y-1 ps-5 last:mb-0">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            );
          case 'kv':
            return (
              <dl key={index} className="mb-2 divide-y divide-border last:mb-0">
                {block.rows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex gap-3 py-1">
                    <dt className="w-2/5 shrink-0 text-muted">{row.key}</dt>
                    <dd className="flex-1 whitespace-pre-wrap">{row.value}</dd>
                  </div>
                ))}
              </dl>
            );
          case 'table':
            return (
              <div key={index} className="mb-2 overflow-x-auto last:mb-0">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {block.columns.map((column) => (
                        <th
                          key={column.key}
                          scope="col"
                          className="border-b border-border p-2 text-start font-semibold"
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {block.columns.map((column) => (
                          <td key={column.key} className="border-b border-border p-2">
                            {String(row[column.key] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </>
  );
}
