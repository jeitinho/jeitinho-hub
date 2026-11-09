import { useEffect, useState } from "react";
import { Bell, Download, Share, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { t } from "@/lib/i18n";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const DISMISS_KEY = "hub-pwa-dismissed";
const FN_URL = "https://sxzdabtarlgozixcbzus.supabase.co/functions/v1/push-send";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}
function b64ToUint8(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function publicKey(): Promise<string> {
  const { data } = await db.rpc("push_public_key");
  if (data) return data as string;
  const r = await fetch(FN_URL);
  return ((await r.json()) as { publicKey: string }).publicKey;
}

/** Abonne cet appareil aux notifications (doit suivre un geste de l'utilisateur). */
export async function enablePush(userId: string): Promise<boolean> {
  if (!pushSupported()) return false;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;
  const reg = await navigator.serviceWorker.ready;
  const key = await publicKey();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(key) }));
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await db.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error(error.message);
  return true;
}

/**
 * Installe le service worker, puis propose au bon moment :
 *  - d'installer le hub comme une app (Android : bouton ; iPhone : « Partager → Sur l'écran d'accueil ») ;
 *  - d'activer les notifications (nouvelles demandes, réservations, sorties assignées).
 */
export function PwaSetup() {
  const { user } = useAuth();
  const [installEvt, setInstallEvt] = useState<InstallPrompt | null>(null);
  const [mode, setMode] = useState<"none" | "install-ios" | "install" | "push">("none");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  useEffect(() => {
    if (!user) return;
    let dismissed: Record<string, number> = {};
    try {
      dismissed = JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "{}");
    } catch {
      /* ignore */
    }
    const recently = (k: string) => Date.now() - (dismissed[k] ?? 0) < 7 * 86400_000;
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    if (pushSupported() && Notification.permission === "default" && !recently("push")) setMode("push");
    else if (mobile && !isStandalone() && isIos() && !recently("install")) setMode("install-ios");
    else if (installEvt && !isStandalone() && !recently("install")) setMode("install");
    else setMode("none");
  }, [user, installEvt]);

  const dismiss = (k: "push" | "install") => {
    try {
      const d = JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "{}");
      d[k] = Date.now();
      localStorage.setItem(DISMISS_KEY, JSON.stringify(d));
    } catch {
      /* ignore */
    }
    setMode("none");
  };

  if (mode === "none" || !user) return null;

  return (
    <div className="border-b border-border bg-card px-4 py-2.5 lg:px-6">
      <div className="mx-auto flex max-w-[1440px] items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {mode === "push" ? <Bell className="h-4 w-4" /> : mode === "install-ios" ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        </div>
        <p className="min-w-0 flex-1 text-[13px] leading-snug">
          {mode === "push" && t("Reçois une notification pour chaque nouvelle demande, réservation et sortie qui t'est assignée.")}
          {mode === "install-ios" &&
            t("Installe le hub sur ton iPhone : touche Partager puis « Sur l'écran d'accueil ». Les notifications marchent ensuite comme une app.")}
          {mode === "install" && t("Installe le hub comme une app sur cet appareil.")}
        </p>
        {mode === "push" && (
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const ok = await enablePush(user.id);
                if (ok) toast.success(t("Notifications activées sur cet appareil."));
                else if (isIos() && !isStandalone())
                  toast.message(t("Sur iPhone, installe d'abord le hub sur l'écran d'accueil."));
                setMode("none");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("Activer")}
          </Button>
        )}
        {mode === "install" && installEvt && (
          <Button
            size="sm"
            onClick={async () => {
              await installEvt.prompt();
              setInstallEvt(null);
              setMode("none");
            }}
          >
            {t("Installer")}
          </Button>
        )}
        <button
          type="button"
          aria-label={t("Plus tard")}
          onClick={() => dismiss(mode === "push" ? "push" : "install")}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
