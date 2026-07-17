import { supabase } from "@/integrations/supabase/client";
import { JeitinhoLogo } from "./jeitinho-logo";

export function PendingValidationScreen({ rejected = false }: { rejected?: boolean }) {
  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <JeitinhoLogo className="h-8 w-auto" />
        </div>
        <p className="tracked mb-4 text-[10px] text-muted-foreground">
          {rejected ? "Accès refusé" : "En attente de validation"}
        </p>
        <h1 className="text-3xl leading-tight" style={{ fontFamily: "Fraunces, serif" }}>
          {rejected ? (
            <>Votre compte a été <em style={{ fontStyle: "italic" }}>désactivé.</em></>
          ) : (
            <>Votre compte est <em style={{ fontStyle: "italic" }}>en attente.</em></>
          )}
        </h1>
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          {rejected
            ? "Contactez un administrateur si vous pensez qu'il s'agit d'une erreur."
            : "Un administrateur doit valider votre compte et vous attribuer un rôle avant que vous puissiez accéder à la plateforme. Vous serez notifié par email."}
        </p>
        <button
          onClick={signOut}
          className="mt-8 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}