import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    let callbackId = 0;
    let listenerId = 0;
    const params = new URLSearchParams(window.location.search);
    const counts: Record<string, number> = {};
    (window as any).__invokeCounts = counts;

    const emptyArrays = new Set([
      "get_all_apps",
      "get_hidden",
      "get_pins",
      "get_recents",
      "get_recent_games",
      "get_app_collections",
      "get_game_collections",
      "get_running_launched",
    ]);

    const responses: Record<string, unknown> = {
      get_screen_resolution: { width: 1920, height: 1080 },
      get_settings: { default_tab: "Home", animated_heroes: "static" },
      get_app_memberships: {},
      get_game_memberships: {},
      get_custom_data: { apps: [], folders: [] },
      get_custom_art: {},
      get_custom_categories: {},
      get_battery: { percent: 80, charging: false },
      get_cached_art_bulk: {},
      steam_account_status: { connected: false, owned_count: 0 },
      xbox_account_status: { connected: false, owned_count: 0 },
      spotify_status: { connected: true, client_id_set: true, product: "premium" },
      spotify_playback_state: {
        item: {
          id: "track-1",
          name: "Test Track",
          artists: [{ name: "Test Artist" }],
          album: { name: "Test Album", images: [] },
          duration_ms: 180_000,
        },
        progress_ms: 30_000,
        is_playing: false,
        shuffle_state: false,
        repeat_state: "off",
      },
      spotify_playlists: { items: [] },
      spotify_devices: { devices: [] },
      get_system_volume: { percent: 45, muted: false },
      get_brightness: 40,
      ensure_lofi_media: "C:\\Users\\test\\AppData\\Local\\LiftOff\\media\\lofi\\lofi_dog.mp4",
      get_storage_info: Array.from({ length: 8 }, (_, index) => ({ mountPoint: `${String.fromCharCode(67 + index)}:/`, label: index === 0 ? "System" : "Games", totalBytes: 1000000000000, freeBytes: 400000000000, isDefaultInstallDrive: index === 0 })),
      "plugin:window|is_focused": true,
    };

    const gamepadButtons = Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 }));
    const gamepad = { mapping: "standard", axes: [0, 0, 0, 0], buttons: gamepadButtons };
    (window as any).__setGamepadAxis = (axis: number, value: number) => { gamepad.axes[axis] = value; };
    (window as any).__setGamepadButton = (index: number, pressed: boolean) => {
      gamepadButtons[index] = { pressed, touched: pressed, value: pressed ? 1 : 0 };
    };
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [gamepad],
    });

    window.fetch = async () => new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    (window as any).__TAURI_EVENT_PLUGIN_INTERNALS__ = {
      unregisterListener: () => {},
    };
    (window as any).__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label: "main" } },
      convertFileSrc: (path: string) => `http://asset.localhost/${encodeURIComponent(path)}`,
      unregisterCallback: () => {},
      transformCallback: (callback: unknown) => {
        callbackId += 1;
        (window as any)[`_${callbackId}`] = callback;
        return callbackId;
      },
      invoke: async (command: string) => {
        counts[command] = (counts[command] || 0) + 1;
        if (command === "plugin:event|listen") {
          listenerId += 1;
          return listenerId;
        }
        if (command === "plugin:event|unlisten" || command === "plugin:event|emit") return null;
        if (command === "get_settings") {
          const bottombarMode = new URLSearchParams(window.location.search).get("barMode") || "smart";
          return { ...(responses.get_settings as Record<string, unknown>), bottombar_mode: bottombarMode,
            onboarding_complete: params.get("fresh") !== "true", theme: params.get("theme") || "space",
            surface_style: params.get("surface") || "clear", ui_motion: false, ui_scale: 1, language: "en" };
        }
        if (command === "get_all_apps") {
          if (params.has("holdRefresh") && counts[command] > 1) await new Promise((resolve) => { (window as any).__releaseScan = resolve; });
          return params.has("catalog") ? [{ id: "steam://rungameid/620", name: "Portal 2", app_type: "game", installed: true }] : [];
        }
        if (emptyArrays.has(command)) return [];
        if (Object.prototype.hasOwnProperty.call(responses, command)) return responses[command];
        return null;
      },
    };
  });
});

test("boots the Home shell with mocked Tauri commands", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/?barMode=smart");

  await expect(page.getByText("Home", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("#root")).not.toBeEmpty();

  await expect(page.getByRole("img", { name: "MENU button" })).toBeVisible();
  await page.evaluate(() => (window as any).__setGamepadButton(9, true));
  await expect(page.getByText("Helper", { exact: true })).toBeVisible();
  await page.evaluate(() => (window as any).__setGamepadButton(9, false));
  await expect(page.getByText("Test Track", { exact: true })).toBeVisible();
  await expect(page.getByText(/^Volume/)).toBeVisible();
  await expect(page.getByText(/^Brightness/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Controls/ })).toBeVisible();

  const tray = page.getByText("Helper", { exact: true }).locator("xpath=../..");
  const seekSlider = tray.locator('input[type="range"][max="180000"]');
  const systemSliders = tray.locator('input[type="range"][max="100"]');
  await expect(seekSlider).toHaveValue("30000");
  await expect(systemSliders).toHaveCount(2);
  await expect(systemSliders.nth(0)).toHaveValue("45");
  await expect(systemSliders.nth(1)).toHaveValue("40");

  const settingsBox = await tray.getByRole("button", { name: "Settings" }).boundingBox();
  const volumeBox = await tray.getByText(/^Volume/).boundingBox();
  const spotifyBox = await tray.getByText("Test Track", { exact: true }).boundingBox();
  expect(settingsBox?.y).toBeLessThan(volumeBox?.y ?? 0);
  expect(volumeBox?.y).toBeLessThan(spotifyBox?.y ?? 0);

  const trayHeight = await tray.evaluate((element) => element.getBoundingClientRect().height);

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(seekSlider).toHaveValue("30000");
  expect(await tray.evaluate((element) => element.getBoundingClientRect().height)).toBeCloseTo(trayHeight, 1);

  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowRight");
  await expect(seekSlider).toHaveValue("40000");
  await page.keyboard.press("Enter");

  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowLeft");
  await expect(systemSliders.nth(0)).toHaveValue("45");
  await expect(systemSliders.nth(1)).toHaveValue("40");
  expect(await tray.evaluate((element) => element.getBoundingClientRect().height)).toBeCloseTo(trayHeight, 1);

  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowLeft");
  await expect(systemSliders.nth(0)).toHaveValue("40");
  await page.keyboard.press("Escape");
  await page.keyboard.press("ArrowRight");
  await expect(systemSliders.nth(0)).toHaveValue("40");
  expect(pageErrors).toEqual([]);
});

async function frames(page: Page, count: number) {
  await page.evaluate(async (count) => {
    for (let index = 0; index < count; index++) await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }, count);
}

async function pad(page: Page, button: number) {
  await page.evaluate((index) => (window as any).__setGamepadButton(index, true), button);
  await frames(page, 3);
  await page.evaluate((index) => (window as any).__setGamepadButton(index, false), button);
  await frames(page, 3);
}

test("onboarding exposes every footer to a pad and keeps it visible at 1280x800", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/?fresh=true&surface=glass");
  const panel = page.locator("[data-onboarding-step]");
  await expect(panel).toHaveAttribute("data-onboarding-step", "welcome");
  await frames(page, 16);
  for (const step of ["theme", "accent", "surface"]) {
    await pad(page, 0);
    await expect(panel).toHaveAttribute("data-onboarding-step", step);
  }
  await pad(page, 0);
  await expect(panel).toHaveAttribute("data-onboarding-step", "home");
  await pad(page, 5);
  await expect(panel).toHaveAttribute("data-onboarding-step", "visual");
  await pad(page, 5);
  await expect(panel).toHaveAttribute("data-onboarding-step", "sources");
  await expect(panel.getByText("Scan Store Apps", { exact: true })).toBeVisible();
  for (const [step, rows, next] of [["sources", 7, "accounts"], ["accounts", 3, "essentials"], ["essentials", 4, "done"]] as const) {
    await expect(panel).toHaveAttribute("data-onboarding-step", step);
    if (step === "essentials") await expect(panel.getByText("Hide LiftOff when a game launches")).toBeVisible();
    for (let index = 0; index < rows; index++) await pad(page, 13);
    await expect(panel.locator('[data-onboarding-action="next"]')).toHaveAttribute("data-focused", "true");
    await pad(page, 12);
    await expect(panel.locator('[data-onboarding-action="next"]')).toHaveAttribute("data-focused", "false");
    await pad(page, 13);
    await pad(page, 14);
    await expect(panel.locator('[data-onboarding-action="back"]')).toHaveAttribute("data-focused", "true");
    await pad(page, 15);
    const bounds = await panel.boundingBox();
    const button = await panel.locator('[data-onboarding-action="next"]').boundingBox();
    expect(button!.y + button!.height).toBeLessThan(bounds!.y + bounds!.height);
    await pad(page, 0);
    await expect(panel).toHaveAttribute("data-onboarding-step", next);
  }
  await expect(panel.locator('[data-onboarding-action="next"]')).toHaveText("Done");
  await pad(page, 14);
  await pad(page, 0);
  await expect(panel).toHaveAttribute("data-onboarding-step", "essentials");
  await panel.getByRole("button", { name: "Next", exact: true }).click();
  await pad(page, 0);
  await expect(panel).toHaveCount(0);
});

async function reachOnboardingAccounts(page: Page) {
  const panel = page.locator("[data-onboarding-step]");
  await expect(panel).toHaveAttribute("data-onboarding-step", "welcome");
  await frames(page, 16);
  for (const step of ["theme", "accent", "surface", "home"]) {
    await pad(page, 0);
    await expect(panel).toHaveAttribute("data-onboarding-step", step);
  }
  await pad(page, 5);
  await expect(panel).toHaveAttribute("data-onboarding-step", "visual");
  await pad(page, 5);
  await expect(panel).toHaveAttribute("data-onboarding-step", "sources");
  await pad(page, 5);
  await expect(panel).toHaveAttribute("data-onboarding-step", "accounts");
  return panel;
}

test("onboarding Steam and Microsoft dialogs stack above setup and return to accounts", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/?fresh=true&surface=glass");
  const panel = await reachOnboardingAccounts(page);
  const overlay = page.locator("[data-onboarding-overlay]");

  await pad(page, 0);
  const steam = page.locator('[data-modal="steam-qr"]');
  await expect(steam).toBeVisible();
  const steamZ = await steam.evaluate((el) => Number(getComputedStyle(el).zIndex));
  const overlayZ = await overlay.evaluate((el) => Number(getComputedStyle(el).zIndex));
  expect(steamZ).toBeGreaterThan(overlayZ);
  await pad(page, 1);
  await frames(page, 20);
  await expect(steam).toHaveCount(0);
  await expect(panel).toHaveAttribute("data-onboarding-step", "accounts");

  await pad(page, 13);
  await pad(page, 0);
  const microsoftTitle = page.getByText("Microsoft account", { exact: true });
  await expect(microsoftTitle).toBeVisible();
  const microsoftZ = await microsoftTitle.evaluate((el) => {
    let node: HTMLElement | null = el as HTMLElement;
    while (node && getComputedStyle(node).position !== "fixed") node = node.parentElement;
    return node ? Number(getComputedStyle(node).zIndex) : 0;
  });
  expect(microsoftZ).toBeGreaterThan(await overlay.evaluate((el) => Number(getComputedStyle(el).zIndex)));
  await pad(page, 1);
  await frames(page, 20);
  await expect(microsoftTitle).toHaveCount(0);
  await expect(panel).toHaveAttribute("data-onboarding-step", "accounts");
});

for (const catalog of [false, true]) {
  test(`fresh Home backdrop with ${catalog ? "detected games" : "no games"}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/?fresh=true${catalog ? "&catalog" : ""}`);
    await expect(page.locator("[data-onboarding-step]")).toBeVisible();
    const home = page.locator("[data-home-root]");
    if (catalog) await expect(home).toContainText("Portal 2");
    else await expect(home).toContainText("Launch a game to see it here");
    await page.screenshot({ path: info.outputPath("fresh-home.png") });
  });
}

test("Data joystick scrolling preserves storage rows and moves monotonically", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByText("Home", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Open helper tray", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByText("Data", { exact: true }).click();
  const storage = page.getByText("Device Storage", { exact: true }).locator("..");
  await expect(storage).toContainText("D: — Games");
  await storage.evaluate((element) => { (window as any).__storageRow = element; });
  const callsBefore = await page.evaluate(() => (window as any).__invokeCounts.get_storage_info);
  await frames(page, 16);
  let previous = 0;
  await page.evaluate(() => (window as any).__setGamepadAxis(1, 1));
  for (let sample = 0; sample < 12; sample++) {
    await page.waitForTimeout(100);
    const current = await storage.evaluate((element) => {
      let scroller = element.parentElement;
      while (scroller && getComputedStyle(scroller).overflowY !== "auto") scroller = scroller.parentElement;
      return scroller?.scrollTop || 0;
    });
    expect(current).toBeGreaterThanOrEqual(previous - 1);
    previous = current;
  }
  await page.evaluate(() => (window as any).__setGamepadAxis(1, 0));
  expect(previous).toBeGreaterThan(0);
  await frames(page, 3);
  await page.evaluate(() => (window as any).__setGamepadAxis(1, -1));
  await page.waitForTimeout(900);
  await page.evaluate(() => (window as any).__setGamepadAxis(1, 0));
  const firstAction = page.locator("[data-settings-row].focused");
  await expect(firstAction).toContainText("Clear Recently Played");
  const bounds = await firstAction.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(124);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(800);
  expect(await storage.evaluate((element) => element === (window as any).__storageRow)).toBe(true);
  expect(await page.evaluate(() => (window as any).__invokeCounts.get_storage_info)).toBe(callsBefore);
});

for (const [theme, surface] of [["space", "glass"], ["sky", "aero"], ["wash", "material"], ["space", "clear"], ["lofi", "obsidian"], ["cyberpunk", "neon"], ["webcore", "win9x"], ["onyx", "clear"]]) {
  test(`helper and refresh inherit ${theme}/${surface} surfaces`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/?theme=${theme}&surface=${surface}&holdRefresh`);
    await expect(page.getByText("Home", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Open helper tray", exact: true }).click();
    const tray = page.locator('[data-modal="helper"]');
    await expect(tray).toBeVisible();
    const getSurface = (element: Element) => {
      const style = getComputedStyle(element);
      return { background: style.background, border: style.border, shadow: style.boxShadow, blur: style.backdropFilter, radius: style.borderRadius };
    };
    const helperStyle = await tray.evaluate(getSurface);
    if (surface === "material" || surface === "win9x") expect(helperStyle.blur).toBe("none");
    else expect(helperStyle.blur).toContain("blur(");
    if (theme === "cyberpunk" || surface === "win9x") expect(helperStyle.radius).toBe("0px");
    await page.screenshot({ path: info.outputPath("helper.png") });
    await tray.getByRole("button", { name: "Controls", exact: true }).click();
    const controls = page.locator('[data-modal=""]');
    await expect(controls).toBeVisible();
    const standardStyle = await controls.evaluate(getSurface);
    if (["neon", "glass", "aero", "clear", "obsidian"].includes(surface)) {
      expect(helperStyle.background).not.toBe(standardStyle.background);
      if (surface === "neon") expect(helperStyle.blur).toContain("blur(12px)");
    } else {
      expect(standardStyle).toEqual(helperStyle);
    }
    await page.keyboard.press("Escape");
    await expect(controls).toHaveCount(0);
    await page.getByRole("button", { name: "Open helper tray", exact: true }).click();
    await tray.getByRole("button", { name: /Refresh/ }).click();
    const refresh = page.locator('[data-modal="library-refresh"]');
    await expect(refresh).toBeVisible();
    expect((await refresh.locator(".lo-loading-spinner").boundingBox())!.width).toBeGreaterThan(0);
    expect(await refresh.evaluate(getSurface)).toEqual(["neon", "glass", "aero", "clear", "obsidian"].includes(surface) ? standardStyle : helperStyle);
    expect(await refresh.locator("..").evaluate((element) => getComputedStyle(element).backdropFilter)).toBe("none");
    await page.screenshot({ path: info.outputPath("refresh.png") });
  });
}

for (const mode of ["full", "hidden"] as const) {
  test(`opens the helper tray on a single MENU press in ${mode} mode`, async ({ page }) => {
    await page.goto(`/?barMode=${mode}`);
    await expect(page.getByText("Home", { exact: true }).first()).toBeVisible({ timeout: 10_000 });

    await page.evaluate(() => (window as any).__setGamepadButton(9, true));
    await expect(page.getByText("Helper", { exact: true })).toBeVisible();
    await page.evaluate(() => (window as any).__setGamepadButton(9, false));
  });
}
