import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccentColors, App } from "../../types";
import { getBestGamepad, readGpState, shouldHandleDirectionRepeat, rumble, type GpState } from "../../utils/gamepad";

type LaunchStatus = "launching" | "verifying" | "focused" | "running_unfocused" | "unconfirmed" | "failed";
type FocusedAction = "focus" | "dismiss";
type SteamLaunchPhase = "starting_steam" | "contacting_steam" | "syncing_cloud" | "updating_game" | "starting_game" | "waiting_for_steam" | "waiting_for_window";

interface LaunchPhasePayload {
  launchPath: string;
  phase: SteamLaunchPhase;
}

interface LaunchOverlayProps {
  app: App | null;
  gameArt: Record<string, string>;
  customArt: Record<string, string>;
  accent: AccentColors;
  onDone: () => void;
  onSuccess?: () => void;
  hapticEnabled?: boolean;
}

export function LaunchOverlay({ app, gameArt, customArt, accent, onDone, onSuccess, hapticEnabled = true }: LaunchOverlayProps) {
  const { t } = useTranslation();
  const art = app?.app_type === "game" ? (customArt?.[app.id] || gameArt[app.id]) : null;
  const [status, setStatus] = useState<LaunchStatus>("launching");
  const [steamPhase, setSteamPhase] = useState<SteamLaunchPhase | null>(() =>
    app?.launch_path.startsWith("steam://") ? "contacting_steam" : null
  );
  const [focusedAction, setFocusedAction] = useState<FocusedAction>("dismiss");
  const rafRef = useRef<number | null>(null);
  const lastGp = useRef<Partial<GpState>>({});
  const pressTimeRef = useRef<Record<string, number>>({});
  const repeatingRef = useRef<Record<string, boolean>>({});
  const mounted = useRef(true);
  const statusRef = useRef(status);
  const focusedActionRef = useRef(focusedAction);

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { focusedActionRef.current = focusedAction; }, [focusedAction]);
  useEffect(() => {
    if (status === "running_unfocused" || status === "unconfirmed") {
      setFocusedAction("focus");
      focusedActionRef.current = "focus";
    } else if (status === "failed") {
      setFocusedAction("dismiss");
      focusedActionRef.current = "dismiss";
    }
  }, [status]);

  useEffect(() => {
    if (!app) return;
    const launchTarget = app;
    const done = onDone;
    const success = onSuccess;
    mounted.current = true;

    const style = document.createElement("style");
    style.id = "launch-overlay-styles";
    style.textContent = `
      @keyframes overlayFadeIn   { from { opacity: 0; } to { opacity: 1; } }
      @keyframes launchIconPop   { 0% { transform: scale(0.7); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
      @keyframes launchTextFade  { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes launchDot       { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
      @keyframes launchGlowPulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.2); opacity: 1; } }
      .launch-overlay { animation: overlayFadeIn var(--dur-base) var(--ease-standard) forwards; }
      .launch-icon    { animation: launchIconPop var(--dur-slow) var(--ease-spring) forwards; }
      .launch-text    { animation: launchTextFade var(--dur-base) var(--ease-standard) forwards; animation-delay: var(--dur-base); opacity: 0; }
      .launch-dot     { animation: launchDot 1s ease-in-out infinite; }
      .launch-dot:nth-child(2) { animation-delay: 0.15s; }
      .launch-dot:nth-child(3) { animation-delay: 0.3s; }
      .launch-glow    { animation: launchGlowPulse 1.5s var(--ease-standard) infinite; }
    `;
    document.head.appendChild(style);

    let unlistenSuccess: (() => void) | undefined;
    let unlistenFailed: (() => void) | undefined;
    let unlistenUnconfirmed: (() => void) | undefined;
    let unlistenPhase: (() => void) | undefined;
    listen<LaunchPhasePayload>("launch-phase", (event) => {
      if (!mounted.current || event.payload.launchPath !== launchTarget.launch_path) return;
      setSteamPhase(event.payload.phase);
    }).then(fn => { unlistenPhase = fn; });
    listen<string>("launch-success", async (event) => {
      if (!mounted.current || event.payload !== launchTarget.launch_path) return;
      const requiresConfirmation = launchTarget.launch_path.startsWith("steam://")
        && launchTarget.app_type === "game";
      setStatus("verifying");

      try {
        const result = await invoke<{ focused: boolean; running: boolean }>("check_launch_focus", {
          name: launchTarget.name,
          launchPath: launchTarget.launch_path,
          source: launchTarget.source,
        });

        if (!mounted.current) return;

        if (requiresConfirmation && !result.focused && !result.running) {
          setStatus("unconfirmed");
          return;
        }
        success?.();
        rumble("launch", hapticEnabled);

        if (result.focused) {
          setStatus("focused");
          window.setTimeout(() => {
            if (mounted.current) done();
          }, 700);
        } else if (result.running) {
          // Running but behind LiftOff — focus it, then dismiss softly (Decision 3C).
          setStatus("focused");
          invoke("try_focus_launched_app", {
            name: launchTarget.name,
            launchPath: launchTarget.launch_path,
            source: launchTarget.source,
            appType: launchTarget.app_type,
          }).catch(() => {});
          window.setTimeout(() => {
            if (mounted.current) done();
          }, 700);
        } else {
          // Preserve bounded dismissal for non-Steam indirect launches.
          setStatus("focused");
          window.setTimeout(() => {
            if (mounted.current) done();
          }, 900);
        }
      } catch {
        // A failed verification must not become a Steam game success cue.
        if (mounted.current) {
          if (requiresConfirmation) {
            setStatus("unconfirmed");
            return;
          }
          success?.();
          rumble("launch", hapticEnabled);
          setStatus("focused");
          window.setTimeout(() => {
            if (mounted.current) done();
          }, 900);
        }
      }
    })
      .then(fn => { unlistenSuccess = fn; });
    listen<string>("launch-unconfirmed", (event) => {
      if (mounted.current && event.payload === launchTarget.launch_path) setStatus("unconfirmed");
    }).then(fn => { unlistenUnconfirmed = fn; });
    listen("launch-failed", () => { if (mounted.current) setStatus("failed"); })
      .then(fn => { unlistenFailed = fn; });

    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") done(); };
    window.addEventListener("keydown", handleKey);

    let suppressFrames = 10;
    const poll = (now: number) => {
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        if (suppressFrames > 0) {
          suppressFrames--;
          lastGp.current = state;
        } else {
          const currentStatus = statusRef.current;
          const actions: FocusedAction[] = currentStatus === "running_unfocused" || currentStatus === "unconfirmed"
            ? ["focus", "dismiss"]
            : currentStatus === "failed"
              ? ["dismiss"]
              : [];

          if (actions.length > 0) {
            const movedLeft = shouldHandleDirectionRepeat("ArrowLeft", state, lastGp.current, now, pressTimeRef.current, repeatingRef.current);
            const movedUp = shouldHandleDirectionRepeat("ArrowUp", state, lastGp.current, now, pressTimeRef.current, repeatingRef.current);
            const movedRight = shouldHandleDirectionRepeat("ArrowRight", state, lastGp.current, now, pressTimeRef.current, repeatingRef.current);
            const movedDown = shouldHandleDirectionRepeat("ArrowDown", state, lastGp.current, now, pressTimeRef.current, repeatingRef.current);
            const movedPrev = movedLeft || movedUp;
            const movedNext = movedRight || movedDown;
            if (movedPrev || movedNext) {
              const i = Math.max(0, actions.indexOf(focusedActionRef.current));
              const next = movedPrev
                ? actions[Math.max(i - 1, 0)]
                : actions[Math.min(i + 1, actions.length - 1)];
              if (next !== focusedActionRef.current) {
                setFocusedAction(next);
                focusedActionRef.current = next;
              }
            }

            if (state.Enter && !lastGp.current.Enter) {
              if (focusedActionRef.current === "focus") {
                invoke("try_focus_launched_app", {
                  name: launchTarget.name,
                  launchPath: launchTarget.launch_path,
                  source: launchTarget.source,
                  appType: launchTarget.app_type,
                }).catch(() => {});
              } else {
                done();
              }
            }
          }

          if (state.Escape && !lastGp.current.Escape) done();
          lastGp.current = state;
        }
      }
      rafRef.current = requestAnimationFrame(poll);
    };
    rafRef.current = requestAnimationFrame(poll);

    return () => {
      mounted.current = false;
      document.getElementById("launch-overlay-styles")?.remove();
      window.removeEventListener("keydown", handleKey);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      unlistenSuccess?.();
      unlistenFailed?.();
      unlistenUnconfirmed?.();
      unlistenPhase?.();
    };
  }, []);

  const isBusy = status === "launching" || status === "verifying";
  const canRetryFocus = status === "running_unfocused" || status === "unconfirmed";
  const statusColor = status === "failed"
    ? "rgba(255,90,90,0.95)"
    : status === "focused"
      ? "rgba(145,255,175,0.95)"
      : "rgba(255,255,255,0.72)";
  const steamPhaseText = steamPhase === "starting_steam"
    ? t("launch.startingSteam")
    : steamPhase === "contacting_steam"
      ? t("launch.contactingSteam")
      : steamPhase === "syncing_cloud"
        ? t("launch.syncingCloud")
        : steamPhase === "updating_game"
          ? t("launch.updatingGame", { name: app?.name })
          : steamPhase === "starting_game"
            ? t("launch.startingGame", { name: app?.name })
            : steamPhase === "waiting_for_steam"
              ? t("launch.waitingForSteam", { name: app?.name })
              : steamPhase === "waiting_for_window"
                ? t("launch.waitingForWindow", { name: app?.name })
                : t("launch.launching");
  const statusText = status === "launching"
    ? steamPhaseText
    : status === "verifying"
      ? t("launch.verifying")
      : status === "focused"
        ? t("launch.focused")
        : status === "running_unfocused"
          ? t("launch.runningUnfocused")
          : status === "unconfirmed"
            ? t("launch.unconfirmed")
            : t("launch.failed");
  const buttonStyle = (action: FocusedAction) => ({
    padding: "8px 22px", borderRadius: 10, cursor: "pointer",
    fontFamily: "'Segoe UI', sans-serif", fontSize: 13, fontWeight: 600,
    background: focusedAction === action ? `${accent.glow}0.32)` : `${accent.glow}0.18)`,
    border: `1px solid ${focusedAction === action ? accent.primary : `${accent.glow}0.5)`}`,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: "0.06em",
    boxShadow: focusedAction === action ? `0 0 0 2px ${accent.glow}0.18), 0 0 24px ${accent.glow}0.22)` : "none",
    transform: focusedAction === action ? "translateY(-1px)" : "none",
  });
  const tryFocusAgain = () => {
    if (!app) return;
    invoke("try_focus_launched_app", {
      name: app.name,
      launchPath: app.launch_path,
      source: app.source,
      appType: app.app_type,
    }).catch(() => {});
  };

  return (
    <div className="launch-overlay" style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <div className="launch-glow" style={{ position: "absolute", width: 320, height: 320, borderRadius: "50%", background: `radial-gradient(circle, ${accent.glow}0.25) 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div className="launch-icon" style={{ position: "relative", zIndex: 1 }}>
        {art ? (
          <img src={art} alt={app?.name} style={{ width: 160, height: 240, borderRadius: 16, objectFit: "cover", boxShadow: `0 8px 40px ${accent.glow}0.5), 0 0 0 2px ${accent.glow}0.3)` }} />
        ) : app?.icon_base64 ? (
          <div style={{ width: 120, height: 120, borderRadius: 24, background: `${accent.glow}0.15)`, border: `2px solid ${accent.glow}0.4)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 40px ${accent.glow}0.4)`, overflow: "hidden" }}>
            <img src={`data:image/png;base64,${app.icon_base64}`} alt={app.name} style={{ width: 72, height: 72, maxWidth: "100%", maxHeight: "100%", borderRadius: 12, objectFit: "contain", objectPosition: "center", display: "block" }} />
          </div>
        ) : (
          <div style={{ width: 120, height: 120, borderRadius: 24, background: `${accent.glow}0.2)`, border: `2px solid ${accent.glow}0.4)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, fontWeight: 700, color: accent.primary, boxShadow: `0 8px 40px ${accent.glow}0.4)` }}>
            {app?.name?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="launch-text" style={{ fontFamily: "'Segoe UI', sans-serif", textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "white", marginBottom: 8, letterSpacing: "0.02em" }}>{app?.name}</div>
        {isBusy ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{statusText}</span>
            <span style={{ display: "flex", gap: 3 }}>
              {[0,1,2].map(i => <span key={i} className="launch-dot" style={{ width: 4, height: 4, borderRadius: "50%", background: accent.primary, display: "inline-block" }} />)}
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ maxWidth: 360, fontSize: 13, lineHeight: 1.45, color: statusColor, letterSpacing: "0.05em" }}>{statusText}</div>
            {(status === "failed" || canRetryFocus) && (
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                {canRetryFocus && (
                  <button onClick={tryFocusAgain} onMouseEnter={() => setFocusedAction("focus")} style={buttonStyle("focus")}>
                    {t("launch.tryFocusAgain")}
                  </button>
                )}
                <button onClick={onDone} onMouseEnter={() => setFocusedAction("dismiss")} style={buttonStyle("dismiss")}>
                  {canRetryFocus ? t("launch.gotIt") : t("launch.dismiss")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
