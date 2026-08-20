import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { db } from "@/lib/db-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export function ConvertQuoteToTripButton({ quoteId }: { quoteId: string }) {
  const navigate = useNavigate(); const qc = useQueryClient(); const [converting,setConverting]=useState(false);
  const {data,isLoading}=useQuery({queryKey:["quote-trip-link",quoteId],queryFn:async()=>{const [{data:quote,error:quoteError},{data:trip,error:tripError}]=await Promise.all([db.from("quotes").select("id,status,number,reference").eq("id",quoteId).single(),db.from("trips").select("id,reference,status").eq("quote_id",quoteId).maybeSingle()]);if(quoteError)throw new Error(quoteError.message);if(tripError)throw new Error(tripError.message);return {quote:quote as any,trip:trip as any}}});
  if(isLoading||!data)return null;
  if(data.trip)return <Card className="flex flex-wrap items-center justify-between gap-3 border-primary/20 bg-primary/5 p-4"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary"/><div><p className="font-medium">Voyage créé</p><div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><Badge variant="secondary">{data.trip.reference}</Badge><span>{data.trip.status}</span></div></div></div><Button variant="outline" onClick={()=>navigate({to:"/voyages/$id",params:{id:data.trip.id}})}>Ouvrir le voyage <ArrowRight className="ml-2 h-4 w-4"/></Button></Card>;
  if(data.quote.status!=="accepted")return null;
  const convert=async()=>{setConverting(true);try{const {data:tripId,error}=await db.rpc<string>("convert_accepted_quote_to_trip",{p_quote_id:quoteId});if(error)throw new Error(error.message);if(!tripId)throw new Error("La conversion n'a pas retourné de voyage.");toast.success("Voyage créé à partir du devis accepté.");await qc.invalidateQueries({queryKey:["quote-trip-link",quoteId]});navigate({to:"/voyages/$id",params:{id:tripId}})}catch(error){toast.error(error instanceof Error?error.message:"Impossible de créer le voyage.")}finally{setConverting(false)}};
  return <Card className="flex flex-wrap items-center justify-between gap-4 border-amber-500/30 bg-amber-500/5 p-4"><div><p className="font-medium">Devis accepté</p><p className="mt-1 text-sm text-muted-foreground">Transforme ce devis en voyage opérationnel.</p></div><Button onClick={convert} disabled={converting} className="btn-primary">{converting?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<ArrowRight className="mr-2 h-4 w-4"/>}Créer le voyage</Button></Card>;
}
