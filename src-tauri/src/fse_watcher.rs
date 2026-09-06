use std::sync::atomic::{AtomicBool, AtomicIsize, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use tauri::{AppHandle, Emitter, Manager};

#[cfg(windows)]
use std::io::Write;
#[cfg(windows)]
use webview2_com::Microsoft::Web::WebView2::Win32::{
    ICoreWebView2_19, COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL,
    COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW, COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL,
};
#[cfg(windows)]
use windows::core::{w, Interface, BOOL, PCWSTR};
#[cfg(windows)]
use windows::Win32::Foundation::{HWND, RECT};
#[cfg(windows)]
use windows::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED};
#[cfg(windows)]
use windows::Win32::Graphics::Gdi::{
    GetDC, GetMonitorInfoW, GetPixel, MonitorFromWindow, RedrawWindow, ReleaseDC, CLR_INVALID,
    MONITORINFO, MONITOR_DEFAULTTONEAREST, RDW_ALLCHILDREN, RDW_FRAME, RDW_INVALIDATE,
    RDW_UPDATENOW,
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
    BringWindowToTop, FindWindowExW, GetClientRect, GetForegroundWindow, GetWindowRect,
    GetWindowThreadProcessId, IsIconic, IsWindow, IsWindowVisible, SetForegroundWindow,
    SetWindowPos, ShowWindow, HWND_NOTOPMOST, HWND_TOPMOST, SWP_FRAMECHANGED, SWP_NOACTIVATE,
    SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER, SWP_SHOWWINDOW, SW_HIDE, SW_RESTORE, SW_SHOW,
};

const POLL_INTERVAL_MS: u64 = 250;
// The game-alive check is a single IsWindow call plus a GetForegroundWindow
// call. It is cheap enough to run faster than the general poll, and every
// millisecond of latency here is a millisecond of black screen after the game
// closes.
const GAME_ALIVE_POLL_MS: u64 = 120;
const FOREGROUND_GRAB_TIMEOUT_MS: u64 = 12_000;
const SUCCESSOR_GRACE_MS: u64 = 1_500;
const PREFERRED_TARGET_HIDE_GRACE_MS: u64 = 500;
const FULLSCREEN_TOLERANCE_PX: i32 = 8;
const SUMMON_HOLD_MS: u64 = 600;
// Post-exit escape hatch: holding the return shortcut for this long after a game
// exit forces a hard WebView2 reload. Longer than the summon hold on purpose,
// because LiftOff is (supposedly) live and a stray combo must not reload it.
const ESCAPE_HOLD_MS: u64 = 1_500;
const POST_EXIT_ESCAPE_WATCH_MS: u64 = 20_000;
const ESCAPE_POLL_MS: u64 = 50;
// Foreground activation is retried because, under the Windows FSE single-window
// shell, a single SetForegroundWindow is routinely denied and degrades to
// nothing (there is no taskbar to flash). We verify GetForegroundWindow between
// attempts and return as soon as we win.
const FOREGROUND_ATTEMPTS: u32 = 6;
const FOREGROUND_RETRY_SLEEP_MS: u64 = 40;
// WebView2 resume is verified rather than fire-and-forget: after a
// fullscreen-exclusive game releases the GPU, a single SetIsVisible(true) can be
// dropped or land on a stale composition surface, which presents as a fully
// black LiftOff window with no way for the user to recover.
const RESUME_ATTEMPTS: u32 = 8;
const RESUME_RETRY_SLEEP_MS: u64 = 60;
const WEBVIEW_QUERY_TIMEOUT_MS: u64 = 400;
// A visibility readback only proves the controller accepted IsVisible=true; it
// does not prove that WebView2's composition surface is producing frames. If
// the early exit-time resume cannot be verified, bounce presentation once so a
// stale surface is detached before the fallback resume sequence.
const PRESENTATION_RESET_SLEEP_MS: u64 = 40;
// Self-heal window after a game exits. AnyFSE can re-route its visible-window
// slot for a beat after the game process tears down, so we keep checking.
const POST_EXIT_HEAL_MS: u64 = 4_000;
const POST_EXIT_HEAL_POLL_MS: u64 = 250;
// After raising LiftOff we re-assert the foreground for a bounded window: FSE
// tends to route its single visible-window slot back to the Xbox home app right
// after a game exits or after we summon over a game, which would otherwise bounce
// LiftOff out of the active slot a beat after it became visible.
const RESTORE_HOLD_MS: u64 = 1_200;
const RESTORE_HOLD_POLL_MS: u64 = 120;
const STARTUP_FOREGROUND_DELAY_MS: u64 = 400;
// Presentation probe. Controller IsVisible and requestAnimationFrame both pass on
// a composition surface that never presents, so liveness is decided by sampling
// real screen pixels instead. Two consecutive dark samples are required before
// any recovery stage escalates, and the probe is disabled for the session when
// the calibration sample (taken on a known-good screen) is itself dark.
const PROBE_DELAY_MS: u64 = 350;
const PROBE_CONFIRM_DELAY_MS: u64 = 300;
const PROBE_GRID: i32 = 6;
const PROBE_DARK_CHANNEL_MAX: u8 = 20; // window background #100a06 is (16, 10, 6)
const PROBE_DEAD_RATIO: f32 = 0.97;
const PROBE_BASELINE_MAX_RATIO: f32 = 0.85;
const PROBE_BASELINE_DELAY_MS: u64 = 1_500;
const PROBE_BASELINE_RETRY_MS: u64 = 250;
const PROBE_BASELINE_WATCH_MS: u64 = 15_000;
const PROBE_UNCALIBRATED: u32 = u32::MAX;
const CONTROLLER_CYCLE_SLEEP_MS: u64 = 150;
const HOST_CYCLE_SLEEP_MS: u64 = 100;
const RELOAD_FLAG_SETTLE_MS: u64 = 60;
const FSE_LOG_MAX_BYTES: u64 = 512 * 1024;
const RELOAD_FLAG_SCRIPT: &str = "try{sessionStorage.setItem('liftoff:fse-reload','1')}catch(e){}";

// Baseline dark ratio in thousandths, or PROBE_UNCALIBRATED.
static PROBE_BASELINE_MILLI: AtomicU32 = AtomicU32::new(PROBE_UNCALIBRATED);
static PROBE_CALIBRATION_STARTED: AtomicBool = AtomicBool::new(false);
// A new game invalidates every old recovery worker. Serializing recovery keeps
// the watchdog and heal loop from undoing a visibility cycle mid-stage.
static RECOVERY_GENERATION: AtomicU32 = AtomicU32::new(1);
static RELOADED_GENERATION: AtomicU32 = AtomicU32::new(0);
static RECOVERY_LOCK: Mutex<()> = Mutex::new(());
static FSE_LOG_LOCK: Mutex<()> = Mutex::new(());

fn recovery_current(generation: u32) -> bool {
    RECOVERY_GENERATION.load(Ordering::SeqCst) == generation
}

const XINPUT_START: u16 = 0x0010;
const XINPUT_BACK: u16 = 0x0020;
const XINPUT_LEFT_THUMB: u16 = 0x0040;
const XINPUT_RIGHT_THUMB: u16 = 0x0080;
const XINPUT_LEFT_SHOULDER: u16 = 0x0100;
const XINPUT_RIGHT_SHOULDER: u16 = 0x0200;
const MAIN_WINDOW_LABEL: &str = "main";

#[cfg(any(windows, test))]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum WebviewMemoryTarget {
    Normal,
    Low,
}

#[cfg(any(windows, test))]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum WebviewTransition {
    SetVisible(bool),
    SetMemoryTarget(WebviewMemoryTarget),
}

#[cfg(any(windows, test))]
fn webview_transition(visible: bool) -> [WebviewTransition; 2] {
    if visible {
        [
            WebviewTransition::SetMemoryTarget(WebviewMemoryTarget::Normal),
            WebviewTransition::SetVisible(true),
        ]
    } else {
        [
            WebviewTransition::SetVisible(false),
            WebviewTransition::SetMemoryTarget(WebviewMemoryTarget::Low),
        ]
    }
}

#[cfg(windows)]
fn fse_log_path() -> Option<std::path::PathBuf> {
    let dir = crate::liftoff_dir().join("logs");
    std::fs::create_dir_all(&dir).ok()?;
    Some(dir.join("fse.log"))
}

// Append-only diagnostic log for FSE handoff/recovery. Bounded: the file is
// started over before an append would exceed FSE_LOG_MAX_BYTES.
#[cfg(windows)]
fn fse_log(message: &str) {
    let Ok(_guard) = FSE_LOG_LOCK.lock() else {
        return;
    };
    let Some(path) = fse_log_path() else {
        return;
    };
    let epoch_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let line = format!("[{epoch_ms}] pid={} {message}\n", std::process::id());
    if line.len() as u64 > FSE_LOG_MAX_BYTES {
        return;
    }
    let oversized = std::fs::metadata(&path)
        .map(|meta| meta.len() + line.len() as u64 > FSE_LOG_MAX_BYTES)
        .unwrap_or(false);
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .append(!oversized)
        .truncate(oversized)
        .open(&path)
    {
        let _ = file.write_all(line.as_bytes());
    }
}

#[cfg(not(windows))]
#[allow(dead_code)]
fn fse_log(message: &str) {
    let _ = message;
}

// Fraction of a 6x6 grid over the monitor whose screen-DC pixels are near-black.
// Capturing meaningful composited content under FSE is a device validation gate.
#[cfg(windows)]
fn screen_dark_ratio(hwnd: HWND) -> Option<f32> {
    let mon = monitor_rect(hwnd)?;
    let width = mon.right - mon.left;
    let height = mon.bottom - mon.top;
    if width <= 0 || height <= 0 {
        return None;
    }
    unsafe {
        let hdc = GetDC(None);
        if hdc.is_invalid() {
            return None;
        }
        let mut dark = 0u32;
        let mut total = 0u32;
        for gy in 0..PROBE_GRID {
            for gx in 0..PROBE_GRID {
                let x = mon.left + (width * (2 * gx + 1)) / (2 * PROBE_GRID);
                let y = mon.top + (height * (2 * gy + 1)) / (2 * PROBE_GRID);
                let color = GetPixel(hdc, x, y);
                if color.0 == CLR_INVALID {
                    continue;
                }
                total += 1;
                let value = color.0;
                let r = (value & 0xff) as u8;
                let g = ((value >> 8) & 0xff) as u8;
                let b = ((value >> 16) & 0xff) as u8;
                if r <= PROBE_DARK_CHANNEL_MAX
                    && g <= PROBE_DARK_CHANNEL_MAX
                    && b <= PROBE_DARK_CHANNEL_MAX
                {
                    dark += 1;
                }
            }
        }
        let _ = ReleaseDC(None, hdc);
        if total != (PROBE_GRID * PROBE_GRID) as u32 {
            return None;
        }
        Some(dark as f32 / total as f32)
    }
}

// Take the known-good baseline once the main UI is up. A session whose healthy
// screen is already near-black (very dark theme, empty library) disables the
// probe: escalation past stage 0 then only happens via the escape hatch.
pub fn calibrate_presentation_baseline(app: AppHandle) {
    #[cfg(not(windows))]
    {
        let _ = app;
    }

    #[cfg(windows)]
    {
        if PROBE_CALIBRATION_STARTED.swap(true, Ordering::SeqCst) {
            return;
        }
        let generation = RECOVERY_GENERATION.load(Ordering::SeqCst);
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(PROBE_BASELINE_DELAY_MS));
            let deadline = Instant::now() + Duration::from_millis(PROBE_BASELINE_WATCH_MS);
            while Instant::now() < deadline {
                // Do not calibrate against a possibly dead post-game surface.
                if !recovery_current(generation) {
                    fse_log("probe baseline deferred: game watch started before calibration");
                    break;
                }
                let ratio = main_window_hwnd(&app)
                    .filter(|hwnd| probe_owns_screen(*hwnd))
                    .and_then(screen_dark_ratio);
                if let Some(ratio) = ratio {
                    PROBE_BASELINE_MILLI.store((ratio * 1000.0) as u32, Ordering::Relaxed);
                    fse_log(&format!(
                        "probe baseline dark_ratio={ratio:.3} probe_enabled={}",
                        ratio <= PROBE_BASELINE_MAX_RATIO
                    ));
                    return;
                }
                std::thread::sleep(Duration::from_millis(PROBE_BASELINE_RETRY_MS));
            }
            fse_log(
                "probe baseline unavailable: no readable foreground main UI during startup window",
            );
            // A later frontend-ready notification may retry after a real page boot.
            PROBE_CALIBRATION_STARTED.store(false, Ordering::SeqCst);
        });
    }
}

#[cfg(windows)]
fn probe_enabled() -> bool {
    let baseline = PROBE_BASELINE_MILLI.load(Ordering::Relaxed);
    baseline_allows_probe(baseline)
}

fn baseline_allows_probe(baseline: u32) -> bool {
    baseline != PROBE_UNCALIBRATED && (baseline as f32 / 1000.0) <= PROBE_BASELINE_MAX_RATIO
}

fn samples_look_dead(first: Option<f32>, second: Option<f32>) -> bool {
    matches!((first, second), (Some(a), Some(b)) if a >= PROBE_DEAD_RATIO && b >= PROBE_DEAD_RATIO)
}

// Avoid interpreting another foreground application's dark screen as LiftOff.
#[cfg(windows)]
fn probe_owns_screen(hwnd: HWND) -> bool {
    unsafe {
        IsWindow(Some(hwnd)).as_bool()
            && IsWindowVisible(hwnd).as_bool()
            && !IsIconic(hwnd).as_bool()
            && GetForegroundWindow() == hwnd
    }
}

#[cfg(windows)]
fn presentation_looks_dead(hwnd: HWND, stage: &str) -> bool {
    if !probe_enabled() {
        fse_log(&format!(
            "probe[{stage}] skipped: not calibrated or baseline too dark"
        ));
        return false;
    }
    if !probe_owns_screen(hwnd) {
        fse_log(&format!(
            "probe[{stage}] skipped: another window owns the screen"
        ));
        return false;
    }
    let first = screen_dark_ratio(hwnd);
    std::thread::sleep(Duration::from_millis(PROBE_CONFIRM_DELAY_MS));
    if !probe_owns_screen(hwnd) {
        return false;
    }
    let second = screen_dark_ratio(hwnd);
    let dead = samples_look_dead(first, second);
    fse_log(&format!(
        "probe[{stage}] first={first:?} second={second:?} dead={dead}"
    ));
    dead
}

// Last rung: request a fresh page; actual presentation still requires device validation. The
// sessionStorage flag lets the frontend skip the long splash hold when it comes
// back; if the renderer is too dead to run the flag script, a normal splash is
// the worst case.
#[cfg(windows)]
fn hard_reload_webview(app: &AppHandle, hwnd: HWND, reason: &str) {
    fse_log(&format!(
        "hard reload[{reason}]: {}",
        window_snapshot(app, hwnd)
    ));
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return;
    };
    RELOADED_GENERATION.store(RECOVERY_GENERATION.load(Ordering::SeqCst), Ordering::SeqCst);
    let _ = window.eval(RELOAD_FLAG_SCRIPT);
    std::thread::sleep(Duration::from_millis(RELOAD_FLAG_SETTLE_MS));
    let _ = set_webview_visible(app, true);
    let _ = window.with_webview(|webview| unsafe {
        if let Ok(core) = webview.controller().CoreWebView2() {
            let _ = core.Reload();
        }
    });
    ensure_fullscreen_geometry(hwnd);
    raise_window_and_hold(hwnd);
    clear_topmost(hwnd);
    let _ = app.emit("fse:reloaded", ());
}

// For a bounded window after a game exit, a long hold on the configured return
// shortcut forces a hard reload. This is the user's way out if the automatic
// ladder misjudges a dead screen as alive. Deliberately ignores the
// fse_hard_reload_recovery setting: an explicit hold is explicit consent.
#[cfg(windows)]
fn start_post_exit_escape_watch(app: AppHandle, our_hwnd: isize, generation: u32) {
    std::thread::spawn(move || {
        let shortcut = crate::fse_return_shortcut_setting();
        let deadline = Instant::now() + Duration::from_millis(POST_EXIT_ESCAPE_WATCH_MS);
        let mut hold_start: Option<Instant> = None;
        while Instant::now() < deadline && recovery_current(generation) {
            if summon_combo_triggered(
                &mut hold_start,
                &shortcut,
                Duration::from_millis(ESCAPE_HOLD_MS),
            ) {
                let Ok(_guard) = RECOVERY_LOCK.try_lock() else {
                    std::thread::sleep(Duration::from_millis(ESCAPE_POLL_MS));
                    continue;
                };
                if !recovery_current(generation) {
                    return;
                }
                fse_log("escape hatch: return shortcut held after game exit");
                if let Some(hwnd) = hwnd_from_value(our_hwnd) {
                    hard_reload_webview(&app, hwnd, "escape-hatch");
                }
                return;
            }
            std::thread::sleep(Duration::from_millis(ESCAPE_POLL_MS));
        }
    });
}

// Bounded escalation after stage 0 has already run. Every rung re-probes the
// real screen and stops as soon as pixels are alive. Stage 2 hides the host
// window; that vacates the AnyFSE slot, which is acceptable here because the
// game is gone and we immediately re-raise. Stage 3 reloads the page.
#[cfg(windows)]
fn run_presentation_recovery(app: &AppHandle, our_hwnd: isize, reason: &str, generation: u32) {
    let Some(hwnd) = hwnd_from_value(our_hwnd) else {
        return;
    };
    fse_log(&format!(
        "recovery[{reason}] after stage0: {}",
        window_snapshot(app, hwnd)
    ));
    std::thread::sleep(Duration::from_millis(PROBE_DELAY_MS));
    if !recovery_current(generation)
        || !presentation_looks_dead(hwnd, "stage0")
        || !recovery_current(generation)
    {
        return;
    }

    // Stage 1: controller visibility cycle (full transition incl. memory target).
    fse_log("recovery stage1: controller visibility cycle");
    let _ = set_webview_visible(app, false);
    std::thread::sleep(Duration::from_millis(CONTROLLER_CYCLE_SLEEP_MS));
    let _ = resume_webview_verified(app);
    ensure_fullscreen_geometry(hwnd);
    nudge_webview_composition(app, hwnd);
    raise_window(hwnd);
    clear_topmost(hwnd);
    let _ = app.emit("fse:gpu-resumed", ());
    std::thread::sleep(Duration::from_millis(PROBE_DELAY_MS));
    fse_log(&format!(
        "recovery after stage1: {}",
        window_snapshot(app, hwnd)
    ));
    if !recovery_current(generation)
        || !presentation_looks_dead(hwnd, "stage1")
        || !recovery_current(generation)
    {
        return;
    }

    // Stage 2: host window show/hide cycle.
    fse_log("recovery stage2: host window cycle");
    unsafe {
        let _ = ShowWindow(hwnd, SW_HIDE);
    }
    std::thread::sleep(Duration::from_millis(HOST_CYCLE_SLEEP_MS));
    unsafe {
        let _ = ShowWindow(hwnd, SW_SHOW);
    }
    ensure_fullscreen_geometry(hwnd);
    let _ = resume_webview_verified(app);
    raise_window_and_hold(hwnd);
    clear_topmost(hwnd);
    nudge_webview_composition(app, hwnd);
    let _ = app.emit("fse:gpu-resumed", ());
    let _ = app.emit("fse:restored", ());
    std::thread::sleep(Duration::from_millis(PROBE_DELAY_MS));
    fse_log(&format!(
        "recovery after stage2: {}",
        window_snapshot(app, hwnd)
    ));
    if !recovery_current(generation)
        || !presentation_looks_dead(hwnd, "stage2")
        || !recovery_current(generation)
    {
        return;
    }

    // Stage 3: hard reload.
    if crate::fse_hard_reload_recovery_enabled() {
        hard_reload_webview(app, hwnd, reason);
    } else {
        fse_log("recovery stage3 skipped: fse_hard_reload_recovery is off");
    }
}

#[cfg(windows)]
fn webview2_memory_target(target: WebviewMemoryTarget) -> COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL {
    match target {
        WebviewMemoryTarget::Normal => COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL,
        WebviewMemoryTarget::Low => COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW,
    }
}

#[derive(Default)]
pub struct FseWatch {
    current: Mutex<Option<Arc<AtomicBool>>>,
    preferred_game_hwnd: AtomicIsize,
}

impl FseWatch {
    fn finish(&self, completed: &Arc<AtomicBool>) {
        if let Ok(mut guard) = self.current.lock() {
            if guard
                .as_ref()
                .is_some_and(|current| Arc::ptr_eq(current, completed))
            {
                guard.take();
                self.preferred_game_hwnd.store(0, Ordering::SeqCst);
            }
        }
    }

    pub fn cancel(&self) {
        if let Ok(mut guard) = self.current.lock() {
            if let Some(token) = guard.take() {
                token.store(true, Ordering::SeqCst);
            }
        }
        self.preferred_game_hwnd.store(0, Ordering::SeqCst);
    }

    fn install(&self, preferred_game_hwnd: Option<isize>) -> Arc<AtomicBool> {
        RECOVERY_GENERATION.fetch_add(1, Ordering::SeqCst);
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

fn owned_main_handle(managed: isize, owner_pid: u32, our_pid: u32) -> Option<isize> {
    (managed != 0 && owner_pid == our_pid).then_some(managed)
}

#[cfg(windows)]
fn main_window_hwnd(app: &AppHandle) -> Option<HWND> {
    let hwnd = app.get_webview_window(MAIN_WINDOW_LABEL)?.hwnd().ok()?;
    unsafe {
        if !IsWindow(Some(hwnd)).as_bool() {
            return None;
        }
        let mut owner = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut owner));
        owned_main_handle(hwnd_value(hwnd), owner, std::process::id())?;
    }
    Some(hwnd)
}

pub fn log_main_window_identity(app: &AppHandle) {
    #[cfg(windows)]
    if let Some(hwnd) = main_window_hwnd(app) {
        let foreground = unsafe { GetForegroundWindow() };
        fse_log(&format!(
            "main window identity: managed=0x{:x} foreground=0x{:x}",
            hwnd_value(hwnd),
            hwnd_value(foreground)
        ));
    }
    #[cfg(not(windows))]
    let _ = app;
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
fn monitor_rect(hwnd: HWND) -> Option<RECT> {
    let monitor = unsafe { MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST) };
    if monitor.0.is_null() {
        return None;
    }
    let mut info = MONITORINFO {
        cbSize: std::mem::size_of::<MONITORINFO>() as u32,
        ..Default::default()
    };
    if !unsafe { GetMonitorInfoW(monitor, &mut info) }.as_bool() {
        return None;
    }
    Some(info.rcMonitor)
}

#[cfg(windows)]
fn is_fullscreen_like(hwnd: HWND) -> bool {
    let mut rect = RECT::default();
    if unsafe { GetWindowRect(hwnd, &mut rect) }.is_err() {
        return false;
    }
    let Some(mon) = monitor_rect(hwnd) else {
        return false;
    };
    rect.left <= mon.left + FULLSCREEN_TOLERANCE_PX
        && rect.top <= mon.top + FULLSCREEN_TOLERANCE_PX
        && rect.right >= mon.right - FULLSCREEN_TOLERANCE_PX
        && rect.bottom >= mon.bottom - FULLSCREEN_TOLERANCE_PX
}

// One line of everything we would want to know when LiftOff comes back black.
#[cfg(windows)]
fn window_snapshot(app: &AppHandle, hwnd: HWND) -> String {
    unsafe {
        let mut rect = RECT::default();
        let _ = GetWindowRect(hwnd, &mut rect);
        let mon = monitor_rect(hwnd);
        let mut cloaked: u32 = 0;
        let cloak_ok = DwmGetWindowAttribute(
            hwnd,
            DWMWA_CLOAKED,
            &mut cloaked as *mut u32 as *mut _,
            std::mem::size_of::<u32>() as u32,
        )
        .is_ok();
        let child = FindWindowExW(Some(hwnd), None, w!("Chrome_WidgetWin_0"), PCWSTR::null()).ok();
        let child_visible = child.map(|c| IsWindowVisible(c).as_bool());
        format!(
            "rect=({},{},{},{}) monitor={:?} visible={} iconic={} cloaked={} fg=0x{:x} ours=0x{:x} wv_child_visible={:?} controller_visible={:?}",
            rect.left,
            rect.top,
            rect.right,
            rect.bottom,
            mon.map(|m| (m.left, m.top, m.right, m.bottom)),
            IsWindowVisible(hwnd).as_bool(),
            IsIconic(hwnd).as_bool(),
            if cloak_ok { cloaked as i64 } else { -1 },
            hwnd_value(GetForegroundWindow()),
            hwnd_value(hwnd),
            child_visible,
            webview_is_visible(app),
        )
    }
}

// Re-cover the monitor if the host moved or shrank. Shell reclassification is
// one hypothesis for the titled black window; geometry logging distinguishes
// it from a correctly sized window with a stale composition surface.
// Returns true when a correction was needed.
#[cfg(windows)]
fn ensure_fullscreen_geometry(hwnd: HWND) -> bool {
    let Some(mon) = monitor_rect(hwnd) else {
        return false;
    };
    let mut rect = RECT::default();
    if unsafe { GetWindowRect(hwnd, &mut rect) }.is_err() {
        return false;
    }
    if rect == mon {
        return false;
    }
    fse_log(&format!(
        "geometry: window ({},{},{},{}) != monitor ({},{},{},{}), re-covering",
        rect.left, rect.top, rect.right, rect.bottom, mon.left, mon.top, mon.right, mon.bottom
    ));
    unsafe {
        let _ = SetWindowPos(
            hwnd,
            None,
            mon.left,
            mon.top,
            mon.right - mon.left,
            mon.bottom - mon.top,
            SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED | SWP_SHOWWINDOW,
        );
    }
    true
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
fn summon_combo_triggered(
    hold_start: &mut Option<Instant>,
    shortcut: &str,
    hold: Duration,
) -> bool {
    if summon_combo_pressed(shortcut) {
        let started = hold_start.get_or_insert_with(Instant::now);
        return started.elapsed() >= hold;
    }

    *hold_start = None;
    false
}

#[cfg(windows)]
fn set_webview_presentation_visible(app: &AppHandle, visible: bool) -> bool {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return false;
    };

    window
        .with_webview(move |webview| unsafe {
            let _ = webview.controller().SetIsVisible(visible);
        })
        .is_ok()
}

#[cfg(windows)]
fn set_webview_visible(app: &AppHandle, visible: bool) -> bool {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return false;
    };

    window
        .with_webview(move |webview| unsafe {
            let controller = webview.controller();
            for transition in webview_transition(visible) {
                match transition {
                    WebviewTransition::SetVisible(next_visible) => {
                        let _ = controller.SetIsVisible(next_visible);
                    }
                    WebviewTransition::SetMemoryTarget(target) => {
                        // WebView2 Runtime 114+ can proactively discard renderer
                        // resources while LiftOff is inactive. Older runtimes do
                        // not expose ICoreWebView2_19, so visibility still changes
                        // even when this best-effort memory hint is unavailable.
                        if let Ok(core) = controller.CoreWebView2() {
                            if let Ok(core_19) = core.cast::<ICoreWebView2_19>() {
                                let _ = core_19
                                    .SetMemoryUsageTargetLevel(webview2_memory_target(target));
                            }
                        }
                    }
                }
            }
        })
        .is_ok()
}

#[cfg(windows)]
fn suspend_webview(app: &AppHandle) -> bool {
    set_webview_visible(app, false)
}

#[cfg(not(windows))]
fn suspend_webview(app: &AppHandle) -> bool {
    let _ = app;
    true
}

#[cfg(windows)]
#[allow(dead_code)]
fn resume_webview(app: &AppHandle) -> bool {
    set_webview_visible(app, true)
}

// Read back the controller's actual visibility. `with_webview` marshals to the
// main thread, so the result comes back over a channel with a bounded wait
// rather than being read synchronously. `None` means "could not determine",
// which callers treat as success to avoid spinning on a controller that will
// never answer.
#[cfg(windows)]
fn webview_is_visible(app: &AppHandle) -> Option<bool> {
    let window = app.get_webview_window(MAIN_WINDOW_LABEL)?;
    let (tx, rx) = std::sync::mpsc::channel::<bool>();
    window
        .with_webview(move |webview| unsafe {
            let mut visible = BOOL(0);
            if webview.controller().IsVisible(&mut visible).is_ok() {
                let _ = tx.send(visible.as_bool());
            }
        })
        .ok()?;
    rx.recv_timeout(Duration::from_millis(WEBVIEW_QUERY_TIMEOUT_MS))
        .ok()
}

// Resume rendering and confirm it took. Returns false only when the controller
// answered and is still not visible after every attempt.
#[cfg(windows)]
fn resume_webview_verified(app: &AppHandle) -> bool {
    for attempt in 0..RESUME_ATTEMPTS {
        let _ = set_webview_visible(app, true);
        match webview_is_visible(app) {
            Some(true) => return true,
            None => return true,
            Some(false) => {}
        }
        if attempt + 1 < RESUME_ATTEMPTS {
            std::thread::sleep(Duration::from_millis(RESUME_RETRY_SLEEP_MS));
        }
    }
    false
}

#[cfg(windows)]
fn reset_webview_presentation(app: &AppHandle) -> bool {
    // This short exit-time bounce repairs stale composition state; it is not a
    // new background session, so preserve the current memory target until the
    // verified resume restores Normal.
    let _ = set_webview_presentation_visible(app, false);
    std::thread::sleep(Duration::from_millis(PRESENTATION_RESET_SLEEP_MS));
    resume_webview_verified(app)
}

#[cfg(not(windows))]
fn resume_webview_verified(app: &AppHandle) -> bool {
    let _ = app;
    true
}

// Force WebView2 to produce a fresh composited frame WITHOUT touching the host
// HWND. Shrinking the controller bounds by one pixel and restoring them is a
// real size change for Chromium's compositor while preserving host geometry.
#[cfg(windows)]
fn nudge_webview_composition(app: &AppHandle, hwnd: HWND) {
    let mut client = RECT::default();
    if unsafe { GetClientRect(hwnd, &mut client) }.is_err() {
        return;
    }
    if client.right <= 1 || client.bottom <= 1 {
        return;
    }
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return;
    };
    let shrunk = RECT {
        left: 0,
        top: 0,
        right: client.right - 1,
        bottom: client.bottom,
    };
    let full = RECT {
        left: 0,
        top: 0,
        right: client.right,
        bottom: client.bottom,
    };
    // Two marshalled calls with a frame between them so Chromium cannot coalesce
    // the shrink and the restore into a no-op.
    let (tx, rx) = std::sync::mpsc::channel();
    let _ = window.with_webview(move |webview| unsafe {
        let _ = webview.controller().SetBounds(shrunk);
        let _ = tx.send(());
    });
    let _ = rx.recv_timeout(Duration::from_millis(WEBVIEW_QUERY_TIMEOUT_MS));
    std::thread::sleep(Duration::from_millis(16));
    let _ = window.with_webview(move |webview| unsafe {
        let controller = webview.controller();
        let _ = controller.SetBounds(full);
        let _ = controller.NotifyParentWindowPositionChanged();
    });
    unsafe {
        let _ = RedrawWindow(
            Some(hwnd),
            None,
            None,
            RDW_INVALIDATE | RDW_ALLCHILDREN | RDW_FRAME | RDW_UPDATENOW,
        );
    }
}

// Keep checking for a few seconds after a game exits. AnyFSE can bounce its
// visible-window slot back to the home app a beat late, and a resume that was
// accepted at exit time can end up on a surface that never paints.
#[cfg(windows)]
fn start_post_exit_heal(app: AppHandle, our_hwnd: isize, generation: u32) {
    std::thread::spawn(move || {
        let deadline = Instant::now() + Duration::from_millis(POST_EXIT_HEAL_MS);
        while Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(POST_EXIT_HEAL_POLL_MS));
            if !recovery_current(generation) {
                return;
            }
            let Ok(_guard) = RECOVERY_LOCK.try_lock() else {
                continue;
            };
            if webview_is_visible(&app) == Some(false) {
                let _ = set_webview_visible(&app, true);
                if let Some(hwnd) = hwnd_from_value(our_hwnd) {
                    ensure_fullscreen_geometry(hwnd);
                    nudge_webview_composition(&app, hwnd);
                }
                let _ = app.emit("fse:gpu-resumed", ());
            }
        }
    });
}

// Full recovery sequence for "the game exited and LiftOff must come back".
#[cfg(windows)]
fn restore_after_game_exit(app: &AppHandle, our_hwnd: isize, generation: u32) {
    let Ok(_guard) = RECOVERY_LOCK.lock() else {
        return;
    };
    if !recovery_current(generation) {
        return;
    }
    if let Some(hwnd) = hwnd_from_value(our_hwnd) {
        fse_log(&format!(
            "game exit detected: {}",
            window_snapshot(app, hwnd)
        ));
    }
    let resumed = reset_webview_presentation(app);
    if let Some(hwnd) = hwnd_from_value(our_hwnd) {
        unsafe {
            if IsIconic(hwnd).as_bool() {
                let _ = ShowWindow(hwnd, SW_RESTORE);
            } else {
                let _ = ShowWindow(hwnd, SW_SHOW);
            }
        }
        ensure_fullscreen_geometry(hwnd);
        raise_window_and_hold(hwnd);
        clear_topmost(hwnd);
        ensure_fullscreen_geometry(hwnd);
        nudge_webview_composition(app, hwnd);
    }
    if !resumed {
        // Last resort: the controller reported not-visible through every retry.
        // Issue one more unverified call before handing off to the heal thread.
        let _ = set_webview_visible(app, true);
    }
    let _ = app.emit("fse:gpu-resumed", ());
    let _ = app.emit("fse:restored", ());
    start_post_exit_heal(app.clone(), our_hwnd, generation);
    start_post_exit_escape_watch(app.clone(), our_hwnd, generation);
    run_presentation_recovery(app, our_hwnd, "game-exit", generation);
}

#[cfg(not(windows))]
#[allow(dead_code)]
fn resume_webview(app: &AppHandle) -> bool {
    let _ = app;
    true
}

pub fn start_gpu_release_watch(
    app: AppHandle,
    our_hwnd: isize,
    preferred_game_hwnd: Option<isize>,
) {
    #[cfg(not(windows))]
    {
        let _ = (app, our_hwnd, preferred_game_hwnd);
    }

    #[cfg(windows)]
    {
        let cancel = app.state::<FseWatch>().install(preferred_game_hwnd);
        let generation = RECOVERY_GENERATION.load(Ordering::SeqCst);

        std::thread::spawn(move || {
            let Some(managed_hwnd) = main_window_hwnd(&app) else {
                fse_log("game watch rejected: managed main window is unavailable or foreign");
                let _ = app.emit("fse:no-foreground", ());
                app.state::<FseWatch>().finish(&cancel);
                return;
            };
            if our_hwnd != hwnd_value(managed_hwnd) {
                fse_log(&format!(
                    "game watch corrected main HWND: cached=0x{our_hwnd:x} managed=0x{:x}",
                    hwnd_value(managed_hwnd)
                ));
            }
            let our_hwnd = hwnd_value(managed_hwnd);

            let deadline = Instant::now() + Duration::from_millis(FOREGROUND_GRAB_TIMEOUT_MS);
            let mut preferred_ready_since: Option<Instant> = None;
            let mut game_hwnd = loop {
                if cancel.load(Ordering::SeqCst) {
                    return;
                }

                let fg = unsafe { GetForegroundWindow() };
                let fg_value = hwnd_value(fg);
                let preferred_game_hwnd = app.state::<FseWatch>().preferred_game_hwnd();
                let fg_is_other = fg_value != 0
                    && fg_value != our_hwnd
                    && preferred_game_hwnd.map_or(true, |target| hwnd_value(target) == fg_value)
                    && unsafe { IsWindowVisible(fg).as_bool() }
                    && is_fullscreen_like(fg);

                if fg_is_other {
                    break fg;
                }

                if let Some(preferred) = preferred_game_hwnd {
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
            if let Some(liftoff_hwnd) = hwnd_from_value(our_hwnd) {
                clear_topmost(liftoff_hwnd);
            }

            if !suspend_webview(&app) {
                let _ = app.emit("fse:no-foreground", ());
                app.state::<FseWatch>().cancel();
                return;
            }
            let _ = app.emit("fse:gpu-suspended", ());
            if let Some(hwnd) = hwnd_from_value(our_hwnd) {
                fse_log(&format!(
                    "suspended for game 0x{:x}: {}",
                    hwnd_value(game_hwnd),
                    window_snapshot(&app, hwnd)
                ));
            }

            focus_game_window(game_hwnd);
            let mut webview_suspended = true;

            loop {
                if cancel.load(Ordering::SeqCst) {
                    if webview_suspended {
                        let _ = resume_webview_verified(&app);
                        let _ = app.emit("fse:gpu-resumed", ());
                    }
                    return;
                }

                let alive = unsafe { IsWindow(Some(game_hwnd)).as_bool() };
                if !alive {
                    // Resume rendering now, not after the successor grace period.
                    // The game window is already gone, so the user is already
                    // looking at LiftOff's surface. Staying suspended through the
                    // grace window is 1.5 seconds of guaranteed black screen for
                    // the common case where no successor window ever appears. If a
                    // successor does take over we suspend again below.
                    if webview_suspended && resume_webview_verified(&app) {
                        webview_suspended = false;
                        let _ = app.emit("fse:gpu-resumed", ());
                    }
                    let grace_end = Instant::now() + Duration::from_millis(SUCCESSOR_GRACE_MS);
                    let mut reacquired = false;

                    while Instant::now() < grace_end {
                        if cancel.load(Ordering::SeqCst) {
                            if webview_suspended {
                                let _ = resume_webview_verified(&app);
                                let _ = app.emit("fse:gpu-resumed", ());
                            }
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

                        std::thread::sleep(Duration::from_millis(GAME_ALIVE_POLL_MS));
                    }

                    if reacquired {
                        // A successor fullscreen window took the foreground.
                        // Hand the GPU back to it.
                        if !webview_suspended && suspend_webview(&app) {
                            webview_suspended = true;
                            let _ = app.emit("fse:gpu-suspended", ());
                        }
                        continue;
                    }
                    break;
                }

                let foreground = unsafe { GetForegroundWindow() };
                let foreground_value = hwnd_value(foreground);
                if foreground_value == our_hwnd {
                    if webview_suspended && resume_webview_verified(&app) {
                        webview_suspended = false;
                        if let Some(hwnd) = hwnd_from_value(our_hwnd) {
                            nudge_webview_composition(&app, hwnd);
                        }
                        let _ = app.emit("fse:gpu-resumed", ());
                        fse_log(&format!(
                            "foreground return: {}",
                            window_snapshot(&app, foreground)
                        ));
                    }
                } else if foreground_value != 0 && !webview_suspended && suspend_webview(&app) {
                    webview_suspended = true;
                    let _ = app.emit("fse:gpu-suspended", ());
                }

                std::thread::sleep(Duration::from_millis(GAME_ALIVE_POLL_MS));
            }

            // Confirmed exit always runs recovery, even after an early resume.
            restore_after_game_exit(&app, our_hwnd, generation);
            app.state::<FseWatch>().finish(&cancel);
        });
    }
}

#[allow(dead_code)]
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
                if summon_combo_triggered(
                    &mut summon_hold_start,
                    &shortcut,
                    Duration::from_millis(SUMMON_HOLD_MS),
                ) {
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
                        if summon_combo_triggered(
                            &mut summon_hold_start,
                            &shortcut,
                            Duration::from_millis(SUMMON_HOLD_MS),
                        ) {
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
    #[cfg(windows)]
    let _ = resume_webview_verified(&app);
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        restore_liftoff_window(&window, 0);
    }
    let _ = app.emit("fse:restored", ());
}

// Frontend watchdog escape hatch. requestAnimationFrame staying silent is a
// weak signal, but when the frontend does report it we run the same
// screen-probed ladder as the game-exit path instead of one blind resume.
#[tauri::command]
pub fn force_webview_resume(app: AppHandle) {
    #[cfg(windows)]
    {
        let generation = RECOVERY_GENERATION.load(Ordering::SeqCst);
        std::thread::spawn(move || {
            let Ok(_guard) = RECOVERY_LOCK.try_lock() else {
                return;
            };
            if !recovery_current(generation)
                || RELOADED_GENERATION.load(Ordering::SeqCst) == generation
            {
                return;
            }
            let _ = resume_webview_verified(&app);
            let Some(hwnd) = main_window_hwnd(&app) else {
                return;
            };
            let our_hwnd = hwnd_value(hwnd);
            ensure_fullscreen_geometry(hwnd);
            nudge_webview_composition(&app, hwnd);
            let _ = app.emit("fse:gpu-resumed", ());
            run_presentation_recovery(&app, our_hwnd, "frontend-watchdog", generation);
        });
    }
    #[cfg(not(windows))]
    {
        let _ = app;
    }
}

// Paint the native window background in the app's own base colour so any
// moment where WebView2 is not presenting (suspended during gameplay, cold
// start before first paint) shows the theme instead of black.
#[tauri::command]
pub fn set_window_background_color(app: AppHandle, r: u8, g: u8, b: u8) {
    #[cfg(windows)]
    {
        if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
            let _ = window.set_background_color(Some(tauri::window::Color(r, g, b, 255)));
        }
    }
    #[cfg(not(windows))]
    {
        let _ = (app, r, g, b);
    }
}

#[cfg(test)]
mod tests {
    use super::{webview_transition, WebviewMemoryTarget, WebviewTransition};

    #[test]
    fn recovery_accepts_only_the_managed_process_window() {
        // Shell startup/foreground handles must never become LiftOff's identity,
        // including a destroyed handle that Windows later reuses for another PID.
        assert_eq!(super::owned_main_handle(0x30316, 200, 100), None);
        assert_eq!(super::owned_main_handle(0, 100, 100), None);
        assert_eq!(super::owned_main_handle(0x40110, 100, 100), Some(0x40110));
    }

    #[test]
    fn probe_requires_a_safe_baseline_and_two_valid_dark_samples() {
        use super::{baseline_allows_probe, samples_look_dead, PROBE_UNCALIBRATED};
        assert!(!baseline_allows_probe(PROBE_UNCALIBRATED));
        assert!(!baseline_allows_probe(851));
        assert!(baseline_allows_probe(850));
        assert!(samples_look_dead(Some(0.97), Some(1.0)));
        assert!(!samples_look_dead(Some(1.0), None));
        assert!(!samples_look_dead(None, Some(1.0)));
        assert!(!samples_look_dead(Some(1.0), Some(0.96)));
        assert!(!samples_look_dead(Some(0.96), Some(1.0)));
    }

    #[test]
    fn completing_an_old_watch_preserves_its_successor() {
        let watch = super::FseWatch::default();
        let old = watch.install(None);
        let current = watch.install(Some(123));
        watch.finish(&old);
        assert!(!current.load(super::Ordering::SeqCst));
        assert!(watch.prefer_game_window(456));
        watch.finish(&current);
        assert!(!watch.prefer_game_window(789));
    }

    #[test]
    fn old_settings_default_reload_on_and_preserve_explicit_opt_out() {
        let mut value = serde_json::to_value(crate::Settings::default()).unwrap();
        let object = value.as_object_mut().unwrap();
        object.remove("fse_hard_reload_recovery");
        object.insert("hide_on_launch".into(), serde_json::json!(false));
        let migrated: crate::Settings = serde_json::from_value(value.clone()).unwrap();
        assert!(migrated.fse_hard_reload_recovery);
        assert!(!migrated.hide_on_launch);
        value["fse_hard_reload_recovery"] = serde_json::json!(false);
        let opted_out: crate::Settings = serde_json::from_value(value).unwrap();
        assert!(!opted_out.fse_hard_reload_recovery);
    }

    #[test]
    fn background_transition_hides_before_requesting_low_memory() {
        assert_eq!(
            webview_transition(false),
            [
                WebviewTransition::SetVisible(false),
                WebviewTransition::SetMemoryTarget(WebviewMemoryTarget::Low),
            ]
        );
    }

    #[test]
    fn foreground_transition_restores_normal_memory_before_showing() {
        assert_eq!(
            webview_transition(true),
            [
                WebviewTransition::SetMemoryTarget(WebviewMemoryTarget::Normal),
                WebviewTransition::SetVisible(true),
            ]
        );
    }
}
