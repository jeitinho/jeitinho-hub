import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ExperienceForm } from "@/components/experience-form";
import { PageShell } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/experiences/new")({component:NewExperience,head:()=>({meta:[{title:"Nouvelle expérience — JEITINHO"}]})});
function NewExperience(){const navigate=useNavigate();return <PageShell eyebrow="Bibliothèque centrale" title="Nouvelle expérience"><ExperienceForm onSubmit={async(values)=>{const me=await fetch("/api/auth/me",{credentials:"include"}).then(r=>r.json()).catch(()=>null);const {data,error}=await supabase.from("experiences").insert({...values,created_by:me?.user?.id??null}).select("id").single();if(error)return toast.error(error.message);toast.success("Expérience créée");navigate({to:"/experiences/$id",params:{id:(data as any).id}})}}/></PageShell>}
