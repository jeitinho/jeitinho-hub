-- Make externally referenced leads idempotent.
-- Bookings already send a stable external_ref; all other leads remain
-- unchanged because NULL/empty external_ref values are excluded.
CREATE UNIQUE INDEX IF NOT EXISTS leads_source_external_ref_uidx
ON public.leads (source, external_ref)
WHERE external_ref IS NOT NULL AND btrim(external_ref) <> '';
