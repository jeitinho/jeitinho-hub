import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";

export function TripExperiencePicker({ tripId, onAdded }: { tripId: string; onAdded?: () => void }) {
  const [experienceId, setExperienceId] = useState(""); const [partnerId, setPartnerId] = useState(""); const [scheduledAt, setScheduledAt] = useState(""); const [clientPrice, setClientPrice] = useState(""); const [partnerCost, setPartnerCost] = useState("");
  const { data: experiences = [] } = useQuery({ queryKey: ["trip-picker-experiences"], queryFn: async () => { const { data, error } = await (supabase as any).from("experiences").select("id,title").order("title"); if (error) throw error; return data ?? []; } });
  const { data: partners = [] } = useQuery({ queryKey: ["trip-picker-partners"], queryFn: async () => { const { data, error } = await (supabase as any).from("partners").select("id,name").order("name"); if (error) throw error; return data ?? []; } });
  const add = async () => { if (!experienceId) return toast.error("Choisis une expérience."); const { error } = await (supabase as any).from("trip_activities").insert({ trip_id: tripId, experience_id: experienceId, partner_id: partnerId || null, scheduled_at: scheduledAt || null, client_price: clientPrice ? Number(clientPrice) : null, partner_cost: partnerCost ? Number(partnerCost) : null, status: partnerId ? "request_sent" : "to_plan" }); if (error) return toast.error(error.message); toast.success("Prestation ajoutée"); onAdded?.(); };
  return <div className="space-y-3 rounded-lg border p-4"><Select value={experienceId} onValueChange={setExperienceId}><SelectTrigger><SelectValue placeholder="Choisir une expérience" /></SelectTrigger><SelectContent>{experiences.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent></Select><Select value={partnerId} onValueChange={setPartnerId}><SelectTrigger><SelectValue placeholder="Choisir un prestataire (optionnel)" /></SelectTrigger><SelectContent>{partners.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><div className="grid gap-3 sm:grid-cols-3"><Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} /><Input type="number" placeholder="Prix vendu" value={clientPrice} onChange={e => setClientPrice(e.target.value)} /><Input type="number" placeholder="Coût prestataire" value={partnerCost} onChange={e => setPartnerCost(e.target.value)} /></div><Button onClick={add}>Ajouter la prestation</Button></div>;
}
