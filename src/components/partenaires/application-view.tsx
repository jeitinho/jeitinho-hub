import type { ReactNode } from "react";
import {
  APPLICATION_CATEGORY_LABEL,
  APPLICATION_META_KEYS,
  APPLICATION_SECTIONS,
  type PartnerApplication,
} from "@/lib/ops/partenaires";

function humanize(key: string) {
  const s = key.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function isEmpty(v: unknown) {
  return (
    v == null ||
    (typeof v === "string" && !v.trim()) ||
    (Array.isArray(v) && v.length === 0) ||
    (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0)
  );
}

function renderValue(key: string, v: unknown): ReactNode {
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  if (Array.isArray(v))
    return (
      <span className="flex flex-wrap gap-1">
        {v.map((item, i) => (
          <span key={i} className="rounded-full border border-border/70 px-2 py-0.5 text-[11px]">
            {typeof item === "object" ? JSON.stringify(item) : String(item)}
          </span>
        ))}
      </span>
    );
  if (typeof v === "object" && v)
    return (
      <span className="grid gap-0.5">
        {Object.entries(v as Record<string, unknown>)
          .filter(([, x]) => !isEmpty(x))
          .map(([k, x]) => (
            <span key={k}>
              <span className="text-muted-foreground">{humanize(k)} : </span>
              {renderValue(k, x)}
            </span>
          ))}
      </span>
    );
  const s = String(v);
  if (key === "category") return APPLICATION_CATEGORY_LABEL[s] ?? s;
  if (/^https?:\/\//i.test(s))
    return (
      <a href={s} target="_blank" rel="noreferrer" className="break-all text-primary underline">
        {s}
      </a>
    );
  if (key === "email")
    return (
      <a href={`mailto:${s}`} className="break-all text-primary underline">
        {s}
      </a>
    );
  return <span className="whitespace-pre-wrap break-words">{s}</span>;
}

/** Affichage lisible de partners.application (candidature blog.jeitinho.fr/partenaires). */
export function ApplicationView({ application }: { application: PartnerApplication }) {
  const known = new Set<string>(APPLICATION_META_KEYS);
  const sections = APPLICATION_SECTIONS.map((s) => {
    s.fields.forEach(([k]) => known.add(k));
    return {
      title: s.title,
      rows: s.fields
        .filter(([k]) => !isEmpty(application[k]))
        .map(([k, label]) => ({ key: k, label, value: application[k] })),
    };
  });
  const extra = Object.entries(application)
    .filter(([k, v]) => !known.has(k) && !isEmpty(v))
    .map(([k, v]) => ({ key: k, label: humanize(k), value: v }));
  if (extra.length) sections.push({ title: "Autres informations", rows: extra });

  const visible = sections.filter((s) => s.rows.length > 0);
  if (visible.length === 0)
    return <p className="text-xs text-muted-foreground">Candidature vide.</p>;

  return (
    <div className="space-y-4">
      {visible.map((s) => (
        <div key={s.title}>
          <p className="tracked mb-1.5 text-[10px] text-muted-foreground">{s.title}</p>
          <dl className="grid gap-x-3 gap-y-1.5 text-xs sm:grid-cols-[9rem_1fr]">
            {s.rows.map((r) => (
              <div key={r.key} className="contents">
                <dt className="text-muted-foreground">{r.label}</dt>
                <dd className="min-w-0">{renderValue(r.key, r.value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
