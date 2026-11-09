import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Données gardées 30 s : revenir sur un écran l'affiche tout de suite, la mise à jour se fait en fond.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, gcTime: 10 * 60_000, retry: 1 } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Survol d'un lien = préchargement de la page : la navigation paraît instantanée.
    defaultPreload: "intent",
  });

  return router;
};
