export interface GpState {
  ArrowUp: boolean;
  ArrowDown: boolean;
  ArrowLeft: boolean;
  ArrowRight: boolean;
  Enter: boolean;
  Escape: boolean;
  ButtonX: boolean;
  ButtonY: boolean;
  BumperLeft: boolean;
  BumperRight: boolean;
  TriggerLeft: boolean;
  TriggerRight: boolean;
  Select: boolean;
  Start: boolean;
}

export function getBestGamepad(): Gamepad | null {
  const gps = Array.from(navigator.getGamepads()).filter((g): g is Gamepad => g !== null);
  return (
    gps.find(gp => gp.mapping === "standard" && gp.axes.length >= 4) ??
    gps.find(gp => gp.buttons.length >= 4    && gp.axes.length >= 4) ??
    gps[0] ?? null
  );
}

let _lastActiveIdx: number | null = null;

/**
 * Returns the last actively used gamepad.
 * When multiple controllers are connected, switches to whichever one has any input.
 * This ensures the controller being physically used always drives the UI.
 */
export function getActiveGamepad(): Gamepad | null {
  const all = Array.from(navigator.getGamepads());
  const valid = all
    .map((g, i) => ({ g, i }))
    .filter((x): x is { g: Gamepad; i: number } =>
      x.g !== null && x.g.buttons.length >= 4 && x.g.axes.length >= 4
    );

  if (valid.length === 0) return null;

  // Single controller — no switching needed
  if (valid.length === 1) {
    _lastActiveIdx = valid[0].i;
    return valid[0].g;
  }

  // Multiple controllers — switch to whichever has current input
  for (const { g, i } of valid) {
    if (i === _lastActiveIdx) continue;
    if (g.buttons.some(b => b.pressed) || g.axes.some(a => Math.abs(a) > 0.5)) {
      _lastActiveIdx = i;
      return g;
    }
  }

  // Stay on the last active controller if it's still connected
  if (_lastActiveIdx !== null) {
    const current = all[_lastActiveIdx];
    if (current) return current;
  }

  // Fallback: prefer standard mapping, then first valid
  const best = valid.find(x => x.g.mapping === "standard") ?? valid[0];
  _lastActiveIdx = best.i;
  return best.g;
}

export function readGpState(gp: Gamepad): GpState {
  const btn = (i: number) => !!gp.buttons[i]?.pressed;
  const hatLeft  = (gp.axes[6] ?? 0) < -0.5;
  const hatRight = (gp.axes[6] ?? 0) >  0.5;
  const hatUp    = (gp.axes[7] ?? 0) < -0.5;
  const hatDown  = (gp.axes[7] ?? 0) >  0.5;
  return {
    ArrowUp:      btn(12) || hatUp    || gp.axes[1] < -0.5,
    ArrowDown:    btn(13) || hatDown  || gp.axes[1] >  0.5,
    ArrowLeft:    btn(14) || hatLeft  || gp.axes[0] < -0.5,
    ArrowRight:   btn(15) || hatRight || gp.axes[0] >  0.5,
    Enter:        btn(0),
    Escape:       btn(1),
    ButtonX:      btn(2),
    ButtonY:      btn(3),
    BumperLeft:   btn(4),
    BumperRight:  btn(5),
    TriggerLeft:  btn(6),
    TriggerRight: btn(7),
    Select:       btn(8),
    Start:        btn(9),
  };
}

export function detectPlatform(gpId: string): "ps" | "switch" | "xbox" | null {
  const id = (gpId ?? "").toLowerCase();
  if (id.includes("054c") || id.includes("dualshock") || id.includes("dualsense") ||
      id.includes("playstation") || id.includes("sony")) return "ps";
  if (id.includes("057e") || id.includes("nintendo") || id.includes("switch") ||
      id.includes("pro controller") || id.includes("joycon")) return "switch";
  if (id.includes("xbox") || id.includes("xinput") || id.includes("045e") ||
      id.includes("microsoft")) return "xbox";
  return null;
}
