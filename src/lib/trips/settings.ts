import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TripCreationMode = "manual" | "automatic";

const TRIP_SETTINGS_KEY = ["trip-settings"];

export function useTripCreationMode() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: TRIP_SETTINGS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_settings")
        .select("trip_creation_mode")
        .eq("id", 1)
        .single();
      if (error) throw new Error(error.message);
      return data.trip_creation_mode as TripCreationMode;
    },
  });
  const setMode = useMutation({
    mutationFn: async (mode: TripCreationMode) => {
      const { error } = await supabase
        .from("trip_settings")
        .update({ trip_creation_mode: mode })
        .eq("id", 1);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TRIP_SETTINGS_KEY }),
  });
  return { mode: query.data, isLoading: query.isLoading, setMode };
}
