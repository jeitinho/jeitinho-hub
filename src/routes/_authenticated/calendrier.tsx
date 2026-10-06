import { createFileRoute } from "@tanstack/react-router";
import { CalendarPage } from "@/components/calendrier/calendar-page";

export const Route = createFileRoute("/_authenticated/calendrier")({
  component: CalendarPage,
  head: () => ({ meta: [{ title: "Calendrier — JEITINHO" }] }),
});
