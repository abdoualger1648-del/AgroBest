import type { ReactNode } from 'react';

export const inputClass =
  'min-h-12 w-full rounded-xl border border-border bg-surface px-3 py-2 text-base text-fg placeholder:text-muted/70';

interface FieldProps {
  id: string;
  label: string;
  help?: string;
  optional?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ id, label, help, optional, error, children }: FieldProps) {
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block font-medium">
        {label}
        {optional ? (
          <span className="ms-2 text-sm font-normal text-muted">({optional})</span>
        ) : null}
      </label>
      {children}
      {help ? (
        <p id={`${id}-help`} className="mt-1 text-sm text-muted">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      <span className="hidden" aria-hidden="true" data-described-by={describedBy} />
    </div>
  );
}
