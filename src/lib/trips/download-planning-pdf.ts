import { createElement } from "react";
import type { PlanningPdfData } from "@/components/trips/trip-planning-pdf";

/** Génère et télécharge le PDF planning (navigateur uniquement). */
export async function downloadPlanningPdf(planning: PlanningPdfData) {
  const [{ pdf }, { TripPlanningPdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/trips/trip-planning-pdf"),
  ]);
  const blob = await pdf(createElement(TripPlanningPdf, { planning }) as never).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = planningFileName(planning);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function planningFileName(planning: PlanningPdfData) {
  const client = (planning.clientName || "client")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
  return `Planning_Jeitinho_${client}.pdf`;
}
