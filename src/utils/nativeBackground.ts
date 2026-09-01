export function resolveNativeBackgroundRgb(background: string): [number, number, number] | null {
  const probe = document.createElement("div");
  probe.style.backgroundColor = background;
  if (!probe.style.backgroundColor) return null;

  probe.style.display = "none";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).backgroundColor;
  probe.remove();

  const match = computed.match(/^rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i);
  if (!match) return null;
  return match.slice(1, 4).map((value) => (
    Math.max(0, Math.min(255, Number.parseInt(value, 10)))
  )) as [number, number, number];
}
