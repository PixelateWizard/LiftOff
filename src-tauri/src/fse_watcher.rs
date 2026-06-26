use std::sync::atomic::{AtomicBool, Ordering};
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
use windows::Win32::UI::Input::XboxController::{XInputGetState, XINPUT_STATE};
#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::{
    BringWindowToTop, GetForegroundWindow, GetWindowRect, IsWindow, IsWindowVisible,
    SetForegroundWindow, SetWindowPos, ShowWindow, HWND_NOTOPMOST, HWND_TOPMOST, SWP_NOMOVE,
    SWP_NOSIZE, SWP_SHOWWINDOW, SW_RESTORE, SW_SHOW,
};

const POLL_INTERVAL_MS: u64 = 250;
const FOREGROUND_GRAB_TIMEOUT_MS: u64 = 12_000;
const SUCCESSOR_GRACE_MS: u64 = 1_500;
const PREFERRED_TARGET_HIDE_GRACE_MS: u64 = 500;
const FULLSCREEN_TOLERANCE_PX: i32 = 8;
const SUMMON_HOLD_MS: u64 = 600;
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
}

impl FseWatch {
    pub fn cancel(&self) {
        if let Ok(mut guard) = self.current.lock() {
            if let Some(token) = guard.take() {
                token.store(true, Ordering::SeqCst);
            }
        }
    }

    fn install(&self) -> Arc<AtomicBool> {
        let token = Arc::new(AtomicBool::new(false));
        if let Ok(mut guard) = self.current.lock() {
            if let Some(old) = guard.replace(token.clone()) {
                old.store(true, Ordering::SeqCst);
            }
        }
        token
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
fn raise_window(hwnd: HWND) {
    unsafe {
        let _ = ShowWindow(hwnd, SW_RESTORE);
        let _ = SetWindowPos(
            hwnd,
            Some(HWND_TOPMOST),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW,
        );
        let _ = BringWindowToTop(hwnd);
        let _ = SetForegroundWindow(hwnd);
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
    unsafe {
        let _ = ShowWindow(hwnd, SW_SHOW);
        let _ = SetWindowPos(
            hwnd,
            Some(HWND_TOPMOST),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW,
        );
        let _ = BringWindowToTop(hwnd);
        let _ = SetForegroundWindow(hwnd);
        std::thread::sleep(Duration::from_millis(60));
        let _ = SetWindowPos(
            hwnd,
            Some(HWND_NOTOPMOST),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW,
        );
        let _ = SetForegroundWindow(hwnd);
    }
}

#[cfg(windows)]
fn restore_liftoff_window(window: &tauri::WebviewWindow, our_hwnd: isize) {
    let _ = window.show();
    if let Some(hwnd) = window_hwnd(window, our_hwnd) {
        raise_window(hwnd);
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
        let cancel = app.state::<FseWatch>().install();
        let _ = app.emit("fse:watch-started", shortcut.clone());
        let preferred_game_hwnd_value = preferred_game_hwnd.unwrap_or(0);

        std::thread::spawn(move || {
            let preferred_game_hwnd = hwnd_from_value(preferred_game_hwnd_value);
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

                if let Some(preferred) = preferred_game_hwnd {
                    let preferred_ready = unsafe {
                        IsWindow(Some(preferred)).as_bool() && IsWindowVisible(preferred).as_bool()
                    } && is_fullscreen_like(preferred);

                    if preferred_ready {
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

#[tauri::command]
pub fn show_liftoff(app: AppHandle) {
    app.state::<FseWatch>().cancel();
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        restore_liftoff_window(&window, 0);
    }
    let _ = app.emit("fse:restored", ());
}
