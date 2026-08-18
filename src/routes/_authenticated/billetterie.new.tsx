import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CatalogForm } from "@/components/catalog-form";
import { PageShell } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
export const Route=createFileRoute("/_authenticated/billetterie/new")({component:NewTicket,head:()=>({meta:[{title:"Nouvelle billetterie — JEITINHO"}]})});
function NewTicket(){const navigate=useNavigate();return <PageShell eyebrow="Contenu / Catalogue" title="Nouvelle offre billetterie" description="Créer une offre de match, concert ou événement réutilisable dans les voyages."><CatalogForm mode="ticket" onSubmit={async v=>{const {data,error}=await (supabase as any).from("ticket_offers").insert({title:v.title.trim(),venue:v.venue||null,event_date:v.event_date||null,public_price:v.public_price,supplier_net:v.supplier_net,commission_pct:v.commission_pct,currency:v.currency||"BRL",notes:v.notes||null,is_published:v.is_active,category:v.category||null,supplier_cost:v.supplier_cost,commission_basis:v.commission_basis||"sale_price",slug:`${v.title.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-")}-${Date.now()}`}).select("id").single();if(error){toast.error(error.message);return;}toast.success("Offre créée");navigate({to:"/billetterie/$id",params:{id:data.id}});}}/></PageShell>}
