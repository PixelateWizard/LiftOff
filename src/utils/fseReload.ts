const FSE_RELOAD_FLAG = "liftoff:fse-reload";

// The backend sets this flag right before a hard WebView2 reload during FSE
// black-screen recovery. Consuming it lets the boot path skip the long splash
// hold. Library loading still completes through the normal startup path.
export function consumeFseReloadFlag(): boolean {
  try {
    const value = sessionStorage.getItem(FSE_RELOAD_FLAG);
    if (value != null) sessionStorage.removeItem(FSE_RELOAD_FLAG);
    return value === "1";
  } catch {
    return false;
  }
}
