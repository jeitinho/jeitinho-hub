/*
 * Champs <input type="datetime-local"> saisis en heure de Rio (America/Sao_Paulo, UTC−3
 * sans heure d'été depuis 2019), quel que soit le fuseau du navigateur.
 */
const RIO_OFFSET = "-03:00";
const RIO_TZ = "America/Sao_Paulo";

/** ISO (UTC) → "YYYY-MM-DDTHH:mm" en heure de Rio, pour un champ datetime-local. */
export function toRioInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: RIO_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** "YYYY-MM-DDTHH:mm" saisi en heure de Rio → ISO UTC (null si vide ou invalide). */
export function fromRioInput(local: string | null | undefined): string | null {
  if (!local) return null;
  const d = new Date(`${local.length === 16 ? `${local}:00` : local}${RIO_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
