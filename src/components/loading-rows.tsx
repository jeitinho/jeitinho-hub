/** Squelette de chargement : la forme de la page apparaît tout de suite, sans texte « Chargement… ». */
export function LoadingRows({ rows = 4, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-2.5 ${className}`} role="status" aria-label="Chargement">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-xl border border-border bg-card"
          style={{ opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  );
}
