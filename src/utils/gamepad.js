let _lastActiveIdx = null;

export function getActiveGamepad() {
  const all = Array.from(navigator.getGamepads());
  const valid = all
    .map((g, i) => ({ g, i }))
    .filter(({ g }) => g !== null && g.buttons.length >= 4 && g.axes.length >= 4);

  if (valid.length === 0) return null;

  if (valid.length === 1) {
    _lastActiveIdx = valid[0].i;
    return valid[0].g;
  }

  for (const { g, i } of valid) {
    if (i === _lastActiveIdx) continue;
    if (g.buttons.some(b => b.pressed) || g.axes.some(a => Math.abs(a) > 0.5)) {
      _lastActiveIdx = i;
      return g;
    }
  }

  if (_lastActiveIdx !== null) {
    const current = all[_lastActiveIdx];
    if (current) return current;
  }

  const best = valid.find(x => x.g.mapping === "standard") ?? valid[0];
  _lastActiveIdx = best.i;
  return best.g;
}

export function getBestGamepad() {
  const gps = Array.from(navigator.getGamepads()).filter(Boolean);
  return (
    gps.find(gp => gp.mapping === "standard" && gp.axes.length >= 4) ||
    gps.find(gp => gp.buttons.length >= 4    && gp.axes.length >= 4) ||
    gps[0] || null
  );
}

export function readGpState(gp) {
  const btn = (i) => !!gp.buttons[i]?.pressed;
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

export function shouldHandleDirectionRepeat(
  key,
  state,
  lastState,
  now,
  pressTime,
  repeating,
  initialDelay = 350,
  repeatDelay = 100,
) {
  const pressed = !!state[key];
  const wasPressed = !!lastState[key];

  if (pressed && !wasPressed) {
    pressTime[key] = now;
    repeating[key] = false;
    return true;
  }

  if (pressed && wasPressed) {
    const held = now - (pressTime[key] || now);
    if (!repeating[key] && held >= initialDelay) {
      repeating[key] = true;
      pressTime[key] = now;
      return true;
    }
    if (repeating[key] && held >= repeatDelay) {
      pressTime[key] = now;
      return true;
    }
  } else if (!pressed && wasPressed) {
    pressTime[key] = 0;
    repeating[key] = false;
  }

  return false;
}

// Detect controller platform from gamepad ID string
export function detectPlatform(gpId) {
  const id = (gpId || "").toLowerCase();
  if (id.includes("054c") || id.includes("dualshock") || id.includes("dualsense") ||
      id.includes("playstation") || id.includes("sony")) return "ps";
  if (id.includes("057e") || id.includes("nintendo") || id.includes("switch") ||
      id.includes("pro controller") || id.includes("joycon")) return "switch";
  if (id.includes("xbox") || id.includes("xinput") || id.includes("045e") ||
      id.includes("microsoft")) return "xbox";
  return null; // unknown
}

const HAPTIC_PATTERNS = {
  tab: [{ duration: 45, weakMagnitude: 0.24, strongMagnitude: 0.12 }],
  confirm: [{ duration: 60, weakMagnitude: 0.4, strongMagnitude: 0.3 }],
  cancel: [{ duration: 40, weakMagnitude: 0.2, strongMagnitude: 0.08 }],
  startup: [{ duration: 420, weakMagnitude: 0.28, strongMagnitude: 0.12 }],
  startupReady: [
    { duration: 120, weakMagnitude: 0.48, strongMagnitude: 0.3 },
    { startDelay: 150, duration: 260, weakMagnitude: 0.7, strongMagnitude: 0.58 },
  ],
  launch: [{ duration: 250, weakMagnitude: 0.7, strongMagnitude: 0.9 }],
};

export function rumble(pattern, enabled = true) {
  if (!enabled) return;
  const gp = getActiveGamepad();
  const actuator = gp?.vibrationActuator;
  if (!actuator) return;

  for (const pulse of HAPTIC_PATTERNS[pattern] || []) {
    actuator.playEffect("dual-rumble", {
      startDelay: pulse.startDelay ?? 0,
      duration: pulse.duration,
      weakMagnitude: pulse.weakMagnitude,
      strongMagnitude: pulse.strongMagnitude,
    }).catch(() => {});
  }
}
