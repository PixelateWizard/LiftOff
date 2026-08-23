import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    let callbackId = 0;
    let listenerId = 0;

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
      get_settings: { default_tab: "Home", animated_heroes: "static", bottombar_mode: "minimal" },
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
      "plugin:window|is_focused": true,
    };

    const gamepadButtons = Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 }));
    const gamepad = { mapping: "standard", axes: [0, 0, 0, 0], buttons: gamepadButtons };
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
        if (command === "plugin:event|listen") {
          listenerId += 1;
          return listenerId;
        }
        if (command === "plugin:event|unlisten" || command === "plugin:event|emit") return null;
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

  await page.goto("/");

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

  const sliders = page.locator('input[type="range"]');
  await expect(sliders).toHaveCount(3);
  await expect(sliders.nth(0)).toHaveValue("30000");
  await expect(sliders.nth(1)).toHaveValue("45");
  await expect(sliders.nth(2)).toHaveValue("40");

  const tray = page.getByText("Helper", { exact: true }).locator("xpath=../..");
  const trayHeight = await tray.evaluate((element) => element.getBoundingClientRect().height);

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(sliders.nth(0)).toHaveValue("30000");
  expect(await tray.evaluate((element) => element.getBoundingClientRect().height)).toBeCloseTo(trayHeight, 1);

  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowRight");
  await expect(sliders.nth(0)).toHaveValue("40000");
  await page.keyboard.press("Enter");

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowLeft");
  await expect(sliders.nth(1)).toHaveValue("45");
  await expect(sliders.nth(2)).toHaveValue("40");
  expect(await tray.evaluate((element) => element.getBoundingClientRect().height)).toBeCloseTo(trayHeight, 1);

  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowLeft");
  await expect(sliders.nth(1)).toHaveValue("40");
  await page.keyboard.press("Escape");
  await page.keyboard.press("ArrowRight");
  await expect(sliders.nth(1)).toHaveValue("40");
  expect(pageErrors).toEqual([]);
});
