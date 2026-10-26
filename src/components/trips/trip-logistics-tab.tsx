import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plane, Plus, Trash2, Home, Smartphone, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type Logistics = {
  trip_id: string;
  arrival_date: string | null;
  arrival_time: string | null;
  arrival_flight: string | null;
  arrival_airport: string | null;
  departure_date: string | null;
  departure_time: string | null;
  departure_flight: string | null;
  departure_airport: string | null;
  sim_operator: string | null;
  sim_plan: string | null;
  sim_discount: boolean;
};
type Transfer = {
  id: string;
  trip_id: string;
  transfer_date: string | null;
  route: string;
  included: boolean;
  provider: string | null;
  notes: string | null;
};
type Accommodation = {
  id: string;
  trip_id: string;
  name: string;
  address: string | null;
  neighborhood: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
};

const emptyLogistics = (tripId: string): Logistics => ({
  trip_id: tripId,
  arrival_date: null,
  arrival_time: null,
  arrival_flight: null,
  arrival_airport: null,
  departure_date: null,
  departure_time: null,
  departure_flight: null,
  departure_airport: null,
  sim_operator: null,
  sim_plan: null,
  sim_discount: false,
});

function LogisticsCard({ tripId }: { tripId: string }) {
  const qc = useQueryClient();
  const key = ["trip-logistics", tripId];
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_logistics")
        .select("*")
        .eq("trip_id", tripId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Logistics | null) ?? emptyLogistics(tripId);
    },
  });
  const [draft, setDraft] = useState<Logistics | null>(null);
  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);
  if (!draft) return null;

  const save = async () => {
    const { error } = await supabase
      .from("trip_logistics")
      .upsert(draft as never, { onConflict: "trip_id" });
    if (error) return void toast.error(error.message);
    toast.success("Logistique enregistrée");
    qc.invalidateQueries({ queryKey: key });
  };

  return (
    <Card className="space-y-5 p-5">
      <div className="flex items-center gap-2">
        <Plane className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Arrivée & départ</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-xs font-medium text-muted-foreground">Arrivée</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={draft.arrival_date ?? ""}
              onChange={(e) => setDraft({ ...draft, arrival_date: e.target.value || null })}
            />
            <Input
              type="time"
              value={draft.arrival_time ?? ""}
              onChange={(e) => setDraft({ ...draft, arrival_time: e.target.value || null })}
            />
          </div>
          <Input
            placeholder="N° de vol"
            value={draft.arrival_flight ?? ""}
            onChange={(e) => setDraft({ ...draft, arrival_flight: e.target.value || null })}
          />
          <Input
            placeholder="Aéroport (GIG / SDU / autre)"
            value={draft.arrival_airport ?? ""}
            onChange={(e) => setDraft({ ...draft, arrival_airport: e.target.value || null })}
          />
        </div>
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-xs font-medium text-muted-foreground">Départ</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={draft.departure_date ?? ""}
              onChange={(e) => setDraft({ ...draft, departure_date: e.target.value || null })}
            />
            <Input
              type="time"
              value={draft.departure_time ?? ""}
              onChange={(e) => setDraft({ ...draft, departure_time: e.target.value || null })}
            />
          </div>
          <Input
            placeholder="N° de vol"
            value={draft.departure_flight ?? ""}
            onChange={(e) => setDraft({ ...draft, departure_flight: e.target.value || null })}
          />
          <Input
            placeholder="Aéroport (GIG / SDU / autre)"
            value={draft.departure_airport ?? ""}
            onChange={(e) => setDraft({ ...draft, departure_airport: e.target.value || null })}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Carte SIM</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <Input
          placeholder="Opérateur (ex. TIM)"
          value={draft.sim_operator ?? ""}
          onChange={(e) => setDraft({ ...draft, sim_operator: e.target.value || null })}
        />
        <Input
          placeholder="Forfait (ex. 16G)"
          value={draft.sim_plan ?? ""}
          onChange={(e) => setDraft({ ...draft, sim_plan: e.target.value || null })}
        />
        <div className="flex items-center gap-2">
          <Switch
            checked={draft.sim_discount}
            onCheckedChange={(v) => setDraft({ ...draft, sim_discount: v })}
          />
          <Label className="text-xs">Remise</Label>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={save}>Enregistrer la logistique</Button>
      </div>
    </Card>
  );
}

function TransfersCard({ tripId }: { tripId: string }) {
  const qc = useQueryClient();
  const key = ["trip-transfers", tripId];
  const { data: transfers = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_transfers")
        .select("*")
        .eq("trip_id", tripId)
        .order("position")
        .order("transfer_date");
      if (error) throw new Error(error.message);
      return (data ?? []) as Transfer[];
    },
  });
  const [route, setRoute] = useState("");
  const [date, setDate] = useState("");
  const [provider, setProvider] = useState("");
  const [included, setIncluded] = useState(false);

  const add = async () => {
    if (!route.trim()) return void toast.error("Renseigne le trajet (ex. Aéroport → Airbnb).");
    const { error } = await supabase.from("trip_transfers").insert({
      trip_id: tripId,
      route: route.trim(),
      transfer_date: date || null,
      provider: provider.trim() || null,
      included,
      position: transfers.length,
    });
    if (error) return void toast.error(error.message);
    setRoute("");
    setDate("");
    setProvider("");
    setIncluded(false);
    qc.invalidateQueries({ queryKey: key });
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("trip_transfers").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: key });
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center gap-2">
        <Car className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Transferts</h2>
      </div>
      {transfers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun transfert.</p>
      ) : (
        <div className="space-y-2">
          {transfers.map((t) => (
            <div
              key={t.id}
              className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">{t.route}</p>
                <p className="text-xs text-muted-foreground">
                  {t.transfer_date ? `${t.transfer_date.split("-").reverse().join("/")} · ` : ""}
                  {t.included ? "Inclus" : "Non inclus"}
                  {t.provider ? ` · ${t.provider}` : ""}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(t.id)}
                aria-label="Supprimer ce transfert"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-2 border-t pt-4 sm:grid-cols-2">
        <Input
          placeholder="Trajet (ex. Aéroport → Airbnb)"
          value={route}
          onChange={(e) => setRoute(e.target.value)}
        />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input
          placeholder="Prestataire"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <Switch checked={included} onCheckedChange={setIncluded} />
          <Label className="text-xs">Inclus</Label>
        </div>
      </div>
      <Button size="sm" onClick={add}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Ajouter le transfert
      </Button>
    </Card>
  );
}

function AccommodationsCard({ tripId }: { tripId: string }) {
  const qc = useQueryClient();
  const key = ["trip-accommodations", tripId];
  const { data: accommodations = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_accommodations")
        .select("*")
        .eq("trip_id", tripId)
        .order("position")
        .order("start_date");
      if (error) throw new Error(error.message);
      return (data ?? []) as Accommodation[];
    },
  });
  const [name, setName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");

  const add = async () => {
    if (!name.trim()) return void toast.error("Renseigne le nom du logement.");
    const { error } = await supabase.from("trip_accommodations").insert({
      trip_id: tripId,
      name: name.trim(),
      neighborhood: neighborhood.trim() || null,
      address: address.trim() || null,
      start_date: start || null,
      end_date: end || null,
      notes: notes.trim() || null,
      position: accommodations.length,
    });
    if (error) return void toast.error(error.message);
    setName("");
    setNeighborhood("");
    setAddress("");
    setStart("");
    setEnd("");
    setNotes("");
    qc.invalidateQueries({ queryKey: key });
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("trip_accommodations").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: key });
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center gap-2">
        <Home className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Logement</h2>
      </div>
      {accommodations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun logement. Plusieurs logements possibles (ex. Rio + Ilha Grande).
        </p>
      ) : (
        <div className="space-y-2">
          {accommodations.map((a) => (
            <div
              key={a.id}
              className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[a.neighborhood, a.address].filter(Boolean).join(" · ") ||
                    "Quartier / adresse à préciser"}
                </p>
                {(a.start_date || a.end_date) && (
                  <p className="text-xs text-muted-foreground">
                    {a.start_date ? a.start_date.split("-").reverse().join("/") : "?"} →{" "}
                    {a.end_date ? a.end_date.split("-").reverse().join("/") : "?"}
                  </p>
                )}
                {a.notes && <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(a.id)}
                aria-label="Supprimer ce logement"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-2 border-t pt-4 sm:grid-cols-2">
        <Input
          placeholder="Nom (ex. Airbnb Copacabana)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          placeholder="Quartier"
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
        />
        <Input
          className="sm:col-span-2"
          placeholder="Adresse"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        <Textarea
          className="sm:col-span-2"
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <Button size="sm" onClick={add}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Ajouter le logement
      </Button>
    </Card>
  );
}

export function TripLogisticsTab({ tripId }: { tripId: string }) {
  return (
    <div className="space-y-6">
      <LogisticsCard tripId={tripId} />
      <AccommodationsCard tripId={tripId} />
      <TransfersCard tripId={tripId} />
    </div>
  );
}
