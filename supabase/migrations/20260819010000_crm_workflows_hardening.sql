-- JEITINHO CRM workflow hardening
-- Atomic, idempotent prospect -> client conversion.

CREATE OR REPLACE FUNCTION public.convert_prospect_to_client(p_prospect_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.prospects%ROWTYPE;
  v_client_id uuid;
BEGIN
  IF NOT public.can_manage(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT * INTO p
  FROM public.prospects
  WHERE id = p_prospect_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prospect introuvable';
  END IF;

  IF p.client_id IS NOT NULL THEN
    RETURN p.client_id;
  END IF;

  -- Prefer an existing client by email, then phone, to avoid duplicates.
  IF p.email IS NOT NULL AND btrim(p.email) <> '' THEN
    SELECT id INTO v_client_id
    FROM public.clients
    WHERE lower(trim(email)) = lower(trim(p.email))
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_client_id IS NULL AND p.phone IS NOT NULL AND btrim(p.phone) <> '' THEN
    SELECT id INTO v_client_id
    FROM public.clients
    WHERE regexp_replace(phone, '[^0-9]+', '', 'g') = regexp_replace(p.phone, '[^0-9]+', '', 'g')
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (full_name, email, phone, source, status)
    VALUES (p.name, p.email, p.phone, 'prospect', 'client')
    RETURNING id INTO v_client_id;
  END IF;

  UPDATE public.prospects
  SET client_id = v_client_id,
      status = 'won'::public.prospect_status,
      updated_at = now()
  WHERE id = p.id;

  RETURN v_client_id;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_prospect_to_client(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_prospect_to_client(uuid) TO authenticated;

COMMENT ON FUNCTION public.convert_prospect_to_client(uuid) IS
'Atomically converts a manager-owned prospect into a client, reusing an existing client by email/phone and marking the prospect won.';

NOTIFY pgrst, 'reload schema';
