import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAgent } from "./executor";

const Input = z.object({ agentId: z.string().min(1), task: z.string().min(3).max(12000) });

type Ctx = { supabase: import("@supabase/supabase-js").SupabaseClient; userId: string };

export const executeAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => Input.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    const { data: canManage, error } = await supabase.rpc("can_manage", { _user_id: userId });
    if (error) throw new Error(error.message);
    if (!canManage) throw new Error("Forbidden: les agents sont réservés aux administrateurs et managers.");
    return runAgent({ agentId: data.agentId, task: data.task, userId, supabase });
  });
