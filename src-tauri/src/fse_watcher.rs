use std::sync::atomic::{AtomicBool, AtomicIsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use tauri::{AppHandle, Emitter, Manager};

#[cfg(windows)]
use windows::Win32::Foundation::{HWND, RECT};
#[cfg(windows)]
use windows::Win32::Graphics::Gdi::{
    GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST,
};
#[cfg(windows)]
use windows::Win32::System::Threading::{AttachThreadInput, GetCurrentThreadId};
#[cfg(windows)]
use windows::Win32::UI::Input::KeyboardAndMouse::{
    keybd_event, SetActiveWindow, SetFocus, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP, VK_MENU,
};
#[cfg(windows)]
use windows::Win32::UI::Input::XboxController::{XInputGetState, XINPUT_STATE};
#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::{
    BringWindowToTop, GetForegroundWindow, GetWindowRect, GetWindowThreadProcessId, IsIconic,
    IsWindow, IsWindowVisible, SetForegroundWindow, SetWindowPos, ShowWindow, HWND_NOTOPMOST,
    HWND_TOPMOST, SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW, SW_RESTORE, SW_SHOW,
};

const POLL_INTERVAL_MS: u64 = 250;
const FOREGROUND_GRAB_TIMEOUT_MS: u64 = 12_000;
const SUCCESSOR_GRACE_MS: u64 = 1_500;
const PREFERRED_TARGET_HIDE_GRACE_MS: u64 = 500;
const FULLSCREEN_TOLERANCE_PX: i32 = 8;
const SUMMON_HOLD_MS: u64 = 600;
// Foreground activation is retried because, under the Windows FSE single-window
// shell, a single SetForegroundWindow is routinely denied and degrades to
// nothing (there is no taskbar to flash). We verify GetForegroundWindow between
// attempts and return as soon as we win.
const FOREGROUND_ATTEMPTS: u32 = 6;
const FOREGROUND_RETRY_SLEEP_MS: u64 = 40;
// After raising LiftOff we re-assert the foreground for a bounded window: FSE
// tends to route its single visible-window slot back to the Xbox home app right
// after a game exits or after we summon over a game, which would otherwise bounce
// LiftOff out of the active slot a beat after it became visible.
const RESTORE_HOLD_MS: u64 = 1_200;
const RESTORE_HOLD_POLL_MS: u64 = 120;
const STARTUP_FOREGROUND_DELAY_MS: u64 = 400;
const XINPUT_START: u16 = 0x0010;
const XINPUT_BACK: u16 = 0x0020;
const XINPUT_LEFT_THUMB: u16 = 0x0040;
const XINPUT_RIGHT_THUMB: u16 = 0x0080;
const XINPUT_LEFT_SHOULDER: u16 = 0x0100;
const XINPUT_RIGHT_SHOULDER: u16 = 0x0200;
const MAIN_WINDOW_LABEL: &str = "main";

#[derive(Default)]
pub struct FseWatch {
    current: Mutex<Option<Arc<AtomicBool>>>,
    preferred_game_hwnd: AtomicIsize,
}

impl FseWatch {
    pub fn cancel(&self) {
        if let Ok(mut guard) = self.current.lock() {
            if let Some(token) = guard.take() {
                token.store(true, Ordering::SeqCst);
            }
        }
        self.preferred_game_hwnd.store(0, Ordering::SeqCst);
    }

    fn install(&self, preferred_game_hwnd: Option<isize>) -> Arc<AtomicBool> {
        let token = Arc::new(AtomicBool::new(false));
        self.preferred_game_hwnd
            .store(preferred_game_hwnd.unwrap_or(0), Ordering::SeqCst);
        if let Ok(mut guard) = self.current.lock() {
            if let Some(old) = guard.replace(token.clone()) {
                old.store(true, Ordering::SeqCst);
            }
        }
        token
    }

    fn prefer_game_window(&self, hwnd: isize) -> bool {
        if hwnd == 0 {
            return false;
        }
        let active = self
            .current
            .lock()
            .map(|guard| guard.is_some())
            .unwrap_or(false);
        if active {
            self.preferred_game_hwnd.store(hwnd, Ordering::SeqCst);
        }
        active
    }

    #[cfg(windows)]
    fn preferred_game_hwnd(&self) -> Option<HWND> {
        hwnd_from_value(self.preferred_game_hwnd.load(Ordering::SeqCst))
    }
}

#[cfg(windows)]
fn hwnd_value(hwnd: HWND) -> isize {
    hwnd.0 as isize
}

#[cfg(windows)]
fn hwnd_from_value(value: isize) -> Option<HWND> {
    if value == 0 {
        None
    } else {
        Some(HWND(value as _))
    }
}

#[cfg(windows)]
fn window_hwnd(window: &tauri::WebviewWindow, fallback: isize) -> Option<HWND> {
    window.hwnd().ok().or_else(|| hwnd_from_value(fallback))
}

#[cfg(windows)]
fn force_foreground_window(hwnd: HWND, unlock_foreground: bool) {
    unsafe {
        if IsIconic(hwnd).as_bool() {
            let _ = ShowWindow(hwnd, SW_RESTORE);
        } else {
            let _ = ShowWindow(hwnd, SW_SHOW);
        }
    }

    // Without an Explorer shell to hand off focus, the first activation attempt
    // is frequently denied. Retry and verify GetForegroundWindow each time;
    // return as soon as the target is actually foreground. The early return
    // keeps the common case to a single attempt (and a single ALT tap).
    for attempt in 0..FOREGROUND_ATTEMPTS {
        if foreground_attempt(hwnd, unlock_foreground) {
            return;
        }
        if attempt + 1 < FOREGROUND_ATTEMPTS {
            std::thread::sleep(Duration::from_millis(FOREGROUND_RETRY_SLEEP_MS));
        }
    }
}

#[cfg(windows)]
fn foreground_attempt(hwnd: HWND, unlock_foreground: bool) -> bool {
    unsafe {
        let foreground = GetForegroundWindow();
        let our_thread = GetCurrentThreadId();
        let fg_thread = if hwnd_value(foreground) == 0 {
            0
        } else {
            GetWindowThreadProcessId(foreground, None)
        };
        let target_thread = GetWindowThreadProcessId(hwnd, None);

        let attached = fg_thread != 0
            && fg_thread != our_thread
            && AttachThreadInput(our_thread, fg_thread, true).as_bool();
        let attached_target = target_thread != 0
            && target_thread != our_thread
            && target_thread != fg_thread
            && AttachThreadInput(our_thread, target_thread, true).as_bool();

        // Tap ALT whenever some OTHER window currently owns the foreground, not
        // only on the explicit game-focus path. The synthetic input resets the
        // foreground-lock timer so the activation below is honored instead of
        // silently denied. A stray ALT into a foreground game during a summon is
        // an accepted trade-off (the game-focus path already does this).
        let foreign_foreground =
            hwnd_value(foreground) != 0 && hwnd_value(foreground) != hwnd_value(hwnd);
        if unlock_foreground || foreign_foreground {
            tap_alt_key_for_foreground_unlock();
        }

        let _ = BringWindowToTop(hwnd);
        let _ = SetForegroundWindow(hwnd);
        let _ = SetActiveWindow(hwnd);
        let _ = SetFocus(Some(hwnd));

        if attached_target {
            let _ = AttachThreadInput(our_thread, target_thread, false);
        }
        if attached {
            let _ = AttachThreadInput(our_thread, fg_thread, false);
        }

        hwnd_value(GetForegroundWindow()) == hwnd_value(hwnd)
    }
}

#[cfg(windows)]
fn tap_alt_key_for_foreground_unlock() {
    unsafe {
        keybd_event(VK_MENU.0 as u8, 0, KEYBD_EVENT_FLAGS(0), 0);
        keybd_event(VK_MENU.0 as u8, 0, KEYEVENTF_KEYUP, 0);
    }
    std::thread::sleep(Duration::from_millis(20));
}

#[cfg(windows)]
fn raise_window(hwnd: HWND) {
    unsafe {
        // Put LiftOff in the always-on-top band first so it can sit above a
        // topmost fullscreen game, then force activation through the foreground lock.
        let _ = SetWindowPos(
            hwnd,
            Some(HWND_TOPMOST),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW,
        );
    }
    // Self-raise must break the foreground lock as well: over a fullscreen game
    // there is no shell to complete the handoff, so AttachThreadInput alone is
    // not reliable. With the foreign-foreground auto-unlock in foreground_attempt
    // this is belt-and-suspenders, but it keeps the intent explicit.
    force_foreground_window(hwnd, true);
}

#[cfg(windows)]
fn raise_window_and_hold(hwnd: HWND) {
    raise_window(hwnd);
    // FSE re-asserts its home app into the single visible-window slot shortly
    // after a game exits or after we summon over a game. Re-verify and re-raise
    // for a bounded window so LiftOff actually keeps the foreground instead of
    // being bounced back behind the FSE home. We return early-on-win inside
    // raise_window, so this stays cheap once we are stably foreground.
    let deadline = Instant::now() + Duration::from_millis(RESTORE_HOLD_MS);
    while Instant::now() < deadline {
        std::thread::sleep(Duration::from_millis(RESTORE_HOLD_POLL_MS));
        let foreground = unsafe { GetForegroundWindow() };
        if hwnd_value(foreground) != hwnd_value(hwnd) {
            raise_window(hwnd);
        }
    }
}

#[cfg(windows)]
fn clear_topmost(hwnd: HWND) {
    unsafe {
        let _ = SetWindowPos(
            hwnd,
            Some(HWND_NOTOPMOST),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW,
        );
    }
}

#[cfg(windows)]
fn focus_game_window(hwnd: HWND) {
    force_foreground_window(hwnd, true);
    unsafe {
        // The game owns the foreground but should not stay pinned above LiftOff.
        let _ = SetWindowPos(
            hwnd,
            Some(HWND_NOTOPMOST),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW,
        );
    }
}

#[cfg(windows)]
fn restore_liftoff_window(window: &tauri::WebviewWindow, our_hwnd: isize) {
    let _ = window.show();
    if let Some(hwnd) = window_hwnd(window, our_hwnd) {
        raise_window_and_hold(hwnd);
    }
    let _ = window.set_focus();
}

#[cfg(windows)]
fn is_fullscreen_like(hwnd: HWND) -> bool {
    let mut rect = RECT::default();
    if unsafe { GetWindowRect(hwnd, &mut rect) }.is_err() {
        return false;
    }

    let monitor = unsafe { MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST) };
    if monitor.0.is_null() {
        return false;
    }

    let mut info = MONITORINFO {
        cbSize: std::mem::size_of::<MONITORINFO>() as u32,
        ..Default::default()
    };
    if !unsafe { GetMonitorInfoW(monitor, &mut info) }.as_bool() {
        return false;
    }

    rect.left <= info.rcMonitor.left + FULLSCREEN_TOLERANCE_PX
        && rect.top <= info.rcMonitor.top + FULLSCREEN_TOLERANCE_PX
        && rect.right >= info.rcMonitor.right - FULLSCREEN_TOLERANCE_PX
        && rect.bottom >= info.rcMonitor.bottom - FULLSCREEN_TOLERANCE_PX
}

#[cfg(windows)]
fn shortcut_pair(shortcut: &str) -> (u16, u16) {
    match shortcut {
        "view_menu" => (XINPUT_BACK, XINPUT_START),
        "lb_rb" => (XINPUT_LEFT_SHOULDER, XINPUT_RIGHT_SHOULDER),
        _ => (XINPUT_LEFT_THUMB, XINPUT_RIGHT_THUMB),
    }
}

#[cfg(windows)]
fn summon_combo_pressed(shortcut: &str) -> bool {
    let (first, second) = shortcut_pair(shortcut);
    unsafe {
        for user_index in 0..4 {
            let mut state = XINPUT_STATE::default();
            if XInputGetState(user_index, &mut state) == 0 {
                let buttons = state.Gamepad.wButtons.0;
                if buttons & first != 0 && buttons & second != 0 {
                    return true;
                }
            }
        }
    }
    false
}

#[cfg(windows)]
fn summon_combo_triggered(hold_start: &mut Option<Instant>, shortcut: &str) -> bool {
    if summon_combo_pressed(shortcut) {
        let started = hold_start.get_or_insert_with(Instant::now);
        return started.elapsed() >= Duration::from_millis(SUMMON_HOLD_MS);
    }

    *hold_start = None;
    false
}

pub fn start_fse_watch(
    app: AppHandle,
    our_hwnd: isize,
    shortcut: String,
    preferred_game_hwnd: Option<isize>,
) {
    #[cfg(not(windows))]
    {
        let _ = (app, our_hwnd, shortcut, preferred_game_hwnd);
    }

    #[cfg(windows)]
    {
        let cancel = app.state::<FseWatch>().install(preferred_game_hwnd);
        let _ = app.emit("fse:watch-started", shortcut.clone());

        std::thread::spawn(move || {
            let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
                let _ = app.emit("fse:no-foreground", ());
                return;
            };

            if our_hwnd == 0 {
                let _ = app.emit("fse:no-foreground", ());
                return;
            }

            let deadline = Instant::now() + Duration::from_millis(FOREGROUND_GRAB_TIMEOUT_MS);
            let mut preferred_ready_since: Option<Instant> = None;
            let mut game_hwnd = loop {
                if cancel.load(Ordering::SeqCst) {
                    return;
                }

                let fg = unsafe { GetForegroundWindow() };
                let fg_value = hwnd_value(fg);
                let fg_is_other = fg_value != 0
                    && fg_value != our_hwnd
                    && unsafe { IsWindowVisible(fg).as_bool() }
                    && is_fullscreen_like(fg);

                if fg_is_other {
                    break fg;
                }

                let preferred_game_hwnd = app.state::<FseWatch>().preferred_game_hwnd();
                if let Some(preferred) = preferred_game_hwnd {
                    // Resume/focus-recovery hands us the exact game window. Trust
                    // that target instead of waiting on a fullscreen heuristic that
                    // can flicker while the game is still settling.
                    let preferred_alive = unsafe {
                        IsWindow(Some(preferred)).as_bool() && IsWindowVisible(preferred).as_bool()
                    };

                    if preferred_alive {
                        focus_game_window(preferred);
                        let started = preferred_ready_since.get_or_insert_with(Instant::now);
                        if started.elapsed()
                            >= Duration::from_millis(PREFERRED_TARGET_HIDE_GRACE_MS)
                        {
                            break preferred;
                        }
                    } else {
                        preferred_ready_since = None;
                    }
                }

                if Instant::now() >= deadline {
                    let preferred_game_hwnd = app.state::<FseWatch>().preferred_game_hwnd();
                    if let Some(preferred) = preferred_game_hwnd {
                        let preferred_alive = unsafe {
                            IsWindow(Some(preferred)).as_bool()
                                && IsWindowVisible(preferred).as_bool()
                        };
                        if preferred_alive {
                            break preferred;
                        }
                    }
                    let _ = app.emit("fse:no-foreground", ());
                    app.state::<FseWatch>().cancel();
                    return;
                }

                std::thread::sleep(Duration::from_millis(POLL_INTERVAL_MS));
            };

            focus_game_window(game_hwnd);
            if let Some(liftoff_hwnd) = window_hwnd(&window, our_hwnd) {
                clear_topmost(liftoff_hwnd);
            }
            if window.hide().is_err() {
                let _ = app.emit("fse:no-foreground", ());
                app.state::<FseWatch>().cancel();
                return;
            }
            let _ = app.emit("fse:hidden", ());
            focus_game_window(game_hwnd);

            let mut summon_hold_start: Option<Instant> = None;
            loop {
                if cancel.load(Ordering::SeqCst) {
                    return;
                }
                if summon_combo_triggered(&mut summon_hold_start, &shortcut) {
                    restore_liftoff_window(&window, our_hwnd);
                    let _ = app.emit("fse:restored", ());
                    app.state::<FseWatch>().cancel();
                    return;
                }

                let alive = unsafe { IsWindow(Some(game_hwnd)).as_bool() };
                if !alive {
                    let grace_end = Instant::now() + Duration::from_millis(SUCCESSOR_GRACE_MS);
                    let mut reacquired = false;

                    while Instant::now() < grace_end {
                        if cancel.load(Ordering::SeqCst) {
                            return;
                        }
                        if summon_combo_triggered(&mut summon_hold_start, &shortcut) {
                            restore_liftoff_window(&window, our_hwnd);
                            let _ = app.emit("fse:restored", ());
                            app.state::<FseWatch>().cancel();
                            return;
                        }

                        let fg = unsafe { GetForegroundWindow() };
                        let fg_value = hwnd_value(fg);
                        if fg_value != 0
                            && fg_value != our_hwnd
                            && unsafe { IsWindowVisible(fg).as_bool() }
                            && is_fullscreen_like(fg)
                        {
                            game_hwnd = fg;
                            reacquired = true;
                            break;
                        }

                        std::thread::sleep(Duration::from_millis(POLL_INTERVAL_MS));
                    }

                    if reacquired {
                        continue;
                    }
                    break;
                }

                std::thread::sleep(Duration::from_millis(POLL_INTERVAL_MS));
            }

            restore_liftoff_window(&window, our_hwnd);
            let _ = app.emit("fse:restored", ());
            app.state::<FseWatch>().cancel();
        });
    }
}

// Claim foreground for LiftOff's own window shortly after startup. Under FSE
// nothing hands the freshly launched process the single-window slot, so without
// this LiftOff can come up behind the FSE home app or whatever else is open.
// Runs on a short delay so WebView2 has created its child windows first, holds
// against the FSE re-grab, then drops the topmost band so LiftOff behaves like a
// normal window on the desktop afterward.
pub fn claim_foreground_on_startup(our_hwnd: isize) {
    #[cfg(not(windows))]
    {
        let _ = our_hwnd;
    }

    #[cfg(windows)]
    {
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(STARTUP_FOREGROUND_DELAY_MS));
            if let Some(hwnd) = hwnd_from_value(our_hwnd) {
                raise_window_and_hold(hwnd);
                clear_topmost(hwnd);
            }
        });
    }
}

pub fn prefer_game_window(app: &AppHandle, game_hwnd: isize) -> bool {
    #[cfg(windows)]
    {
        app.state::<FseWatch>().prefer_game_window(game_hwnd)
    }

    #[cfg(not(windows))]
    {
        let _ = (app, game_hwnd);
        false
    }
}

#[tauri::command]
pub fn show_liftoff(app: AppHandle) {
    app.state::<FseWatch>().cancel();
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        restore_liftoff_window(&window, 0);
    }
    let _ = app.emit("fse:restored", ());
}
