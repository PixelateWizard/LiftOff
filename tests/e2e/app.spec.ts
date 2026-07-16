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
      spotify_status: { connected: false, client_id_set: false, product: "" },
      "plugin:window|is_focused": true,
    };

    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [],
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
  expect(pageErrors).toEqual([]);
});
