interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="mb-5">
      <h1 className="text-2xl font-bold text-balance">{title}</h1>
      {description ? <p className="mt-2 text-muted">{description}</p> : null}
    </header>
  );
}
