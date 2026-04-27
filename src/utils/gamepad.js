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
