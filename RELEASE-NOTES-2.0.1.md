# LiftOff 2.0.1

A small follow-up to 2.0. Two fixes for artwork that would not update.

---

## Fixes

**The artwork notice no longer sticks in the bottom bar.** The Smart bar could freeze on a game name while art was loading and never clear, even after LiftOff had already been open for a while. Adding a cloud game was one way to hit it. That notice now finishes and goes away when the artwork work is done.

**A static hero now shows in Game Details.** Picking a static hero for a game updated Home, but the game's info screen kept playing the animated hero if one was already cached. Game Details now follows the static hero you chose for that game.

---

## If you factory-reset 2.0

Factory reset on 2.0 can remove the uninstaller while LiftOff itself stays installed. The 2.0.1 installer then offers **Uninstall before installing**, and that button says **Unable to uninstall!**

On that screen, choose **Do not uninstall** instead, then continue. 2.0.1 installs over the copy you already have and writes a new uninstaller. Settings you created after the reset stay put. The reset itself already cleared the old library data.
