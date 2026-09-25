# LiftOff 2.0.2

A small follow-up to 2.0.1. A privacy policy, sharper hero art, and a factory reset that no longer breaks the next upgrade.

---

## What's new

**There is a privacy policy.** It says what LiftOff stores on your PC, which account tokens stay in Windows Credential Manager, and which services your device talks to directly. The page is linked from the website footer. In the app, Settings → About has a Privacy Policy row that opens the same page.

---

## Fixes

**4K hero backgrounds stay sharp.** When the interface scale is above 1, Home was shrinking a 4K banner and then stretching it back up, which softened the art. The hero is now drawn at the size you actually see. A newly uploaded hero can be saved up to 3840×1240. A smaller picture is not enlarged, and a hero you already saved at 1920×620 stays that size until you save it again.

**Game Details manage actions stay the same height.** Hovering Run as Administrator thickened that tile's border and stretched the row. Every manage tile now keeps the same border, so the row no longer jumps.

**Factory reset leaves the next upgrade able to install.** Reset still clears your LiftOff data. It now leaves `liftoff.exe` and `uninstall.exe` in place. Those files live in the same folder as your data, and deleting the uninstaller is what made the next installer say it could not uninstall the previous version.

If you already factory-reset on 2.0 and the 2.0.1 installer says **Unable to uninstall!**, choose **Do not uninstall** and continue. That installs over the copy you already have. 2.0.2 should not create that situation again.
