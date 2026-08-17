-- Keep quote acceptance and trip creation distinct from payment.
-- If an accepted quote is explicitly converted, its itemized lines are copied into trip activities.
CREATE OR REPLACE FUNCTION public.convert_accepted_quote_to_trip(p_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_trip uuid;
BEGIN
  v_trip := public.create_trip_from_accepted_quote(p_quote_id);
  PERFORM public.copy_quote_lines_to_trip(p_quote_id, v_trip);
  RETURN v_trip;
END;
$$;
COMMENT ON FUNCTION public.convert_accepted_quote_to_trip(uuid) IS 'Explicitly converts an accepted quote into a trip and copies its itemized lines into trip activities.';
