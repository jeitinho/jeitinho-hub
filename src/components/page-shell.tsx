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
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4 sm:mb-6 sm:pb-5">
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-[12.5px] font-medium text-muted-foreground">{eyebrow}</p>}
          <h1 className="text-[24px] leading-tight sm:text-[30px]">{title}</h1>
          {description && (
            <p
              className={`mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground ${
                // Sur téléphone : on garde les descriptions courtes (référence, dates, client…),
                // on masque les phrases d'explication.
                typeof description === "string" && description.length > 90 ? "hidden sm:block" : ""
              }`}
            >
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function ComingSoon({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-card/50 p-16 text-center">
      <p className="tracked mb-3 text-xs text-muted-foreground">Module en préparation</p>
      <h2 className="text-2xl font-display font-medium">{label}</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        L'architecture est en place. L'interface complète de ce module arrive dans une prochaine itération.
      </p>
    </div>
  );
}