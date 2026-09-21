import { describe, expect, it } from "vitest";
import { appLocation, isHttpLaunchPath } from "./appDetails";

describe("appLocation", () => {
  it("prefers the install folder over the launch path", () => {
    expect(appLocation({ install_dir: "C:\\Apps\\Calc", launch_path: "C:\\Apps\\Calc\\calc.exe" }))
      .toBe("C:\\Apps\\Calc");
  });

  it("falls back to the launch path and skips blanks", () => {
    expect(appLocation({ launch_path: "shell:AppsFolder\\Foo_bar" })).toBe("shell:AppsFolder\\Foo_bar");
    expect(appLocation({ install_dir: "  ", launch_path: "" })).toBeNull();
    expect(appLocation({})).toBeNull();
  });
});

describe("isHttpLaunchPath", () => {
  it("detects browser handoffs only", () => {
    expect(isHttpLaunchPath("https://example.com")).toBe(true);
    expect(isHttpLaunchPath("http://localhost")).toBe(true);
    expect(isHttpLaunchPath("C:\\Apps\\foo.lnk")).toBe(false);
    expect(isHttpLaunchPath("steam://rungameid/1")).toBe(false);
  });
});
