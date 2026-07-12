import type { ReactNode } from "react";

export function PageShell({
  title,
  eyebrow,
  description,
  actions,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="tracked mb-2 text-[10px] text-muted-foreground">{eyebrow}</p>}
          <h1 className="text-3xl sm:text-4xl" style={{ fontFamily: "Fraunces, serif", fontWeight: 500, letterSpacing: "-0.01em" }}>
            {title}
          </h1>
          {description && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function ComingSoon({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-card/50 p-16 text-center">
      <p className="tracked mb-3 text-[10px] text-muted-foreground">Module en préparation</p>
      <h2 className="text-2xl" style={{ fontFamily: "Fraunces, serif" }}>{label}</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        L'architecture est en place. L'interface complète de ce module arrive dans une prochaine itération.
      </p>
    </div>
  );
}