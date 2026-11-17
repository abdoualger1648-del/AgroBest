import type { Block } from '@/content/schema';
import { renderInline } from '@/content/markdown';

const NOTE_STYLES = {
  info: 'border-primary/40 bg-primary/5',
  warning: 'border-warning/50 bg-warning/10',
  danger: 'border-danger/50 bg-danger/10',
} as const;

function BlockView({ block, index }: { block: Block; index: number }) {
  switch (block.type) {
    case 'p':
      return <p className="mb-3 last:mb-0">{renderInline(block.text, `b${index}`)}</p>;

    case 'ul':
      return (
        <ul className="mb-3 list-disc space-y-1 ps-5 last:mb-0">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item, `b${index}-${itemIndex}`)}</li>
          ))}
        </ul>
      );

    case 'ol':
      return (
        <ol className="mb-3 list-decimal space-y-1 ps-5 last:mb-0">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item, `b${index}-${itemIndex}`)}</li>
          ))}
        </ol>
      );

    case 'quote':
      return (
        <blockquote className="mb-3 border-s-4 border-border ps-3 text-muted italic last:mb-0">
          {renderInline(block.text, `b${index}`)}
        </blockquote>
      );

    case 'note':
      return (
        <div className={`mb-3 rounded-xl border p-3 last:mb-0 ${NOTE_STYLES[block.variant]}`}>
          {renderInline(block.text, `b${index}`)}
        </div>
      );

    case 'example':
      return (
        <div className="mb-3 rounded-xl border border-border bg-surface-2 p-3 last:mb-0">
          {block.label ? (
            <p className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">
              {renderInline(block.label, `b${index}-label`)}
            </p>
          ) : null}
          <p>{renderInline(block.text, `b${index}`)}</p>
        </div>
      );

    case 'table':
      return (
        <div className="mb-3 overflow-x-auto last:mb-0">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {block.columns.map((column, columnIndex) => (
                  <th
                    key={columnIndex}
                    scope="col"
                    className="border-b border-border p-2 text-start font-semibold"
                  >
                    {renderInline(column, `b${index}-c${columnIndex}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border-b border-border p-2">
                      {renderInline(cell, `b${index}-r${rowIndex}-${cellIndex}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

export function BlockRenderer({ blocks }: { blocks: readonly Block[] }) {
  return (
    <>
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} index={index} />
      ))}
    </>
  );
}
