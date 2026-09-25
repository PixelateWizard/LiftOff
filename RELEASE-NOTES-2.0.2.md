# LiftOff 2.0.2

A small follow-up to 2.0.1. A privacy policy, and sharper hero art.

---

## What's new

**There is a privacy policy.** It says what LiftOff stores on your PC, which account tokens stay in Windows Credential Manager, and which services your device talks to directly. The page is linked from the website footer. In the app, Settings → About has a Privacy Policy row that opens the same page.

---

## Fixes

**4K hero backgrounds stay sharp.** When the interface scale is above 1, Home was shrinking a 4K banner and then stretching it back up, which softened the art. The hero is now drawn at the size you actually see. A newly uploaded hero can be saved up to 3840×1240. A smaller picture is not enlarged, and a hero you already saved at 1920×620 stays that size until you save it again.

**Game Details manage actions stay the same height.** Hovering Run as Administrator thickened that tile's border and stretched the row. Every manage tile now keeps the same border, so the row no longer jumps.

---

## If you factory-reset 2.0

Factory reset on 2.0 can remove the uninstaller while LiftOff itself stays installed. The 2.0.2 installer then offers **Uninstall before installing**, and that button says **Unable to uninstall!**

On that screen, choose **Do not uninstall** instead, then continue. 2.0.2 installs over the copy you already have and writes a new uninstaller. Settings you created after the reset stay put. The reset itself already cleared the old library data.
