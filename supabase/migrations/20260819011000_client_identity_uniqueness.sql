-- Prevent duplicate client identities used by CRM conversion.
CREATE UNIQUE INDEX IF NOT EXISTS clients_email_identity_uidx
ON public.clients (lower(trim(email)))
WHERE email IS NOT NULL AND btrim(email) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS clients_phone_identity_uidx
ON public.clients (regexp_replace(phone, '[^0-9]+', '', 'g'))
WHERE phone IS NOT NULL AND btrim(phone) <> '';
