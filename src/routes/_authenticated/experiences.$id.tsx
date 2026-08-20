import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db-client";
import { ExperienceForm } from "@/components/experience-form";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/experiences/$id")({component:EditExperience,head:()=>({meta:[{title:"Expérience — JEITINHO"}]})});
const toLines=(value:unknown):string[]=>Array.isArray(value)?value.map(String):[];
function EditExperience(){const {id}=Route.useParams();const navigate=useNavigate();const {data,isLoading,refetch}=useQuery({queryKey:["experience",id],queryFn:async()=>{const {data,error}=await db.from("experiences").select("*").eq("id",id).single();if(error)throw new Error(error.message);return data as any}});if(isLoading||!data)return <PageShell title="Chargement…">{null}</PageShell>;return <PageShell eyebrow="Expérience" title={data.title} actions={<Button variant="ghost" className="text-destructive hover:text-destructive" onClick={async()=>{if(!confirm("Supprimer cette expérience ?"))return;const {error}=await db.from("experiences").delete().eq("id",id);if(error)return toast.error(error.message);toast.success("Supprimée");navigate({to:"/experiences"})}}><Trash2 className="mr-2 h-4 w-4"/>Supprimer</Button>}><ExperienceForm initial={{...data,inclusions:toLines(data.inclusions),exclusions:toLines(data.exclusions),conditions:toLines(data.conditions)}} onSubmit={async(values)=>{const {error}=await db.from("experiences").update(values).eq("id",id);if(error)return toast.error(error.message);toast.success("Enregistré");refetch()}}/></PageShell>}
