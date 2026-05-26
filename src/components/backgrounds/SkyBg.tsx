export function SkyBg() {
  return (
    <div
      id="cloud-container"
      style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", overflow: "hidden" }}
    />
  );
}

export default SkyBg;
