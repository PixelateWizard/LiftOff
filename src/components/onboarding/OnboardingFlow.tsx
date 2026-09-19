import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoChevronBack, IoChevronForward, IoLockClosedOutline } from "react-icons/io5";
import i18n from "../../i18n";
import { useTheme } from "../../contexts/ThemeContext";
import { ToggleKnob } from "../ui";
import {
  ACCENTS,
  THEME_LOCKED_SETTINGS,
  THEME_SURFACE_DEFAULTS,
  normalizeThemeKey,
} from "../../constants";
import { getBestGamepad, readGpState, rumble, shouldHandleDirectionRepeat } from "../../utils/gamepad";
import type { GpState } from "../../utils/gamepad";
import type { Settings } from "../../types";
import { getMockRowStyle } from "../SurfacePickerModal";
import { ThemePreview } from "../ThemePickerModal";
import { modalOverlayStyle, modalPanelStyle, modalScrimStyle } from "../modals/modalStyles";
import {
  ACCOUNT_ROWS,
  ACCENT_ITEMS,
  ESSENTIAL_ROWS,
  HOME_ROWS,
  LANGUAGE_OPTIONS,
  PROGRESS_STEPS,
  SOURCE_ROWS,
  STEP_ORDER,
  SURFACE_ITEMS,
  THEME_ITEMS,
  isSingleSelect,
  stepCols,
  stepCount,
  type AccountKey,
  type StepKey,
} from "./steps";

interface AccountSummary {
  connected: boolean;
  label?: string | null;
}

interface OnboardingFlowProps {
  settings: Settings;
  previewSettings: (updates: Partial<Settings>) => void;
  commitSettings: (updates: Partial<Settings>) => void;
  onFinish: (opts: { sourcesChanged: boolean; accountTouched: boolean }) => void;
  playSound: () => void;
  playSoundAlt: () => void;
  accounts: Record<AccountKey, AccountSummary>;
  onOpenAccount: (key: AccountKey) => void;
  childModalOpen: boolean;
}

type Direction = "up" | "down" | "left" | "right";

export function OnboardingFlow({
  settings,
  previewSettings,
  commitSettings,
  onFinish,
  playSound,
  playSoundAlt,
  accounts,
  onOpenAccount,
  childModalOpen,
}: OnboardingFlowProps) {
  const { t } = useTranslation();
  const themeValue = useTheme();
  const { accent, isDark, surfaceStyle, resolvedTheme, theme } = themeValue;
  const initialLanguageIndex = Math.max(
    0,
    LANGUAGE_OPTIONS.indexOf(String(settings.language ?? "auto") as (typeof LANGUAGE_OPTIONS)[number]),
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [cursor, setCursor] = useState(initialLanguageIndex);
  // The body keeps its cursor while focus visits Back, Next/Done, or Skip.
  const [footerFocus, setFooterFocus] = useState<number | null>(null);
  const footerFocusRef = useRef<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const focusFooter = useCallback((index: number | null) => {
    footerFocusRef.current = index;
    setFooterFocus(index);
  }, []);
  const stepIndexRef = useRef(0);
  const cursorRef = useRef(initialLanguageIndex);
  const settingsRef = useRef(settings);
  const draftRef = useRef<Partial<Settings>>({});
  const sourcesChangedRef = useRef(false);
  const finishedRef = useRef(false);
  const accountTouchedRef = useRef(false);
  const childModalOpenRef = useRef(childModalOpen);
  settingsRef.current = settings;
  childModalOpenRef.current = childModalOpen;

  const step: StepKey = STEP_ORDER[stepIndex];
  const stepRef = useRef<StepKey>(step);
  stepRef.current = step;

  const surfaceLocked = useMemo(() => {
    const key = normalizeThemeKey(String(settings.theme));
    return Boolean(THEME_LOCKED_SETTINGS[key]?.surface_style);
  }, [settings.theme]);
  const surfaceLockedRef = useRef(surfaceLocked);
  surfaceLockedRef.current = surfaceLocked;

  const setDraft = useCallback((updates: Partial<Settings>) => {
    draftRef.current = { ...draftRef.current, ...updates };
    previewSettings(updates);
  }, [previewSettings]);
  const setHomeMode = useCallback((homeMode: string) => {
    const updates: Partial<Settings> = {
      home_mode: homeMode,
      cinematic_home: homeMode === "immersive",
    };
    if (homeMode === "semi" && settingsRef.current.home_pinned_pos === "bottom") updates.home_pinned_pos = "top";
    setDraft(updates);
  }, [setDraft]);

  const persistDraft = useCallback(() => {
    if (Object.keys(draftRef.current).length === 0) return;
    commitSettings(draftRef.current);
    draftRef.current = {};
  }, [commitSettings]);

  const closeFlow = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    commitSettings({ ...draftRef.current, onboarding_complete: true });
    draftRef.current = {};
    onFinish({
      sourcesChanged: sourcesChangedRef.current,
      accountTouched: accountTouchedRef.current,
    });
  }, [commitSettings, onFinish]);

  const applyFocusValue = useCallback((index: number) => {
    const currentStep = stepRef.current;
    if (currentStep === "theme") {
      const key = THEME_ITEMS[index];
      setDraft({ theme: key, surface_style: THEME_SURFACE_DEFAULTS[key] ?? "clear" } as Partial<Settings>);
    } else if (currentStep === "accent") {
      setDraft({ accent: ACCENT_ITEMS[index] } as Partial<Settings>);
    } else if (currentStep === "surface") {
      setDraft({ surface_style: SURFACE_ITEMS[index] } as Partial<Settings>);
    } else if (currentStep === "welcome") {
      const language = LANGUAGE_OPTIONS[index];
      setDraft({ language } as Partial<Settings>);
      const resolvedLanguage = language === "auto"
        ? (navigator.language?.split("-")[0] || "en")
        : language;
      void i18n.changeLanguage(resolvedLanguage);
    }
  }, [setDraft]);

  const goToStep = useCallback((next: number) => {
    let target = Math.max(0, Math.min(STEP_ORDER.length - 1, next));
    const direction = target > stepIndexRef.current ? 1 : -1;
    while (STEP_ORDER[target] === "surface" && surfaceLockedRef.current) {
      target += direction;
      if (target <= 0 || target >= STEP_ORDER.length - 1) break;
    }
    target = Math.max(0, Math.min(STEP_ORDER.length - 1, target));
    if (target === stepIndexRef.current) return;
    persistDraft();
    stepIndexRef.current = target;
    setStepIndex(target);

    const nextStep = STEP_ORDER[target];
    stepRef.current = nextStep;
    focusFooter(nextStep === "done" ? 1 : null);
    const currentSettings = settingsRef.current;
    let start = 0;
    if (nextStep === "theme") start = Math.max(0, THEME_ITEMS.indexOf(normalizeThemeKey(String(currentSettings.theme))));
    if (nextStep === "accent") start = Math.max(0, ACCENT_ITEMS.indexOf(String(currentSettings.accent)));
    if (nextStep === "surface") {
      start = Math.max(0, SURFACE_ITEMS.indexOf(String(currentSettings.surface_style ?? "clear") as (typeof SURFACE_ITEMS)[number]));
    }
    if (nextStep === "welcome") {
      start = Math.max(0, LANGUAGE_OPTIONS.indexOf(String(currentSettings.language ?? "auto") as (typeof LANGUAGE_OPTIONS)[number]));
    }
    cursorRef.current = start;
    setCursor(start);
    playSoundAlt();
  }, [focusFooter, persistDraft, playSoundAlt]);

  const moveCursor = useCallback((direction: Direction) => {
    const currentStep = stepRef.current;
    const count = stepCount(currentStep);
    if (footerFocusRef.current !== null) {
      if (direction === "up" && count > 0) focusFooter(null);
      else if (direction === "left" || direction === "right") {
        focusFooter(Math.max(stepIndexRef.current === 0 ? 1 : 0, Math.min(2,
          footerFocusRef.current + (direction === "right" ? 1 : -1))));
      }
      playSound();
      return;
    }
    if (count === 0) return;
    const cols = stepCols(currentStep);
    const current = cursorRef.current;
    const row = Math.floor(current / cols);
    const col = current % cols;
    if (currentStep === "home" && settingsRef.current.home_mode === "normal" && current === 0 && direction === "down") {
      focusFooter(1);
      playSound();
      return;
    }
    if (direction === "down" && (row + 1) * cols >= count) {
      focusFooter(1);
      playSound();
      return;
    }
    let next = current;
    if (direction === "left" && col > 0) next = current - 1;
    if (direction === "right" && col < cols - 1 && current + 1 < count) next = current + 1;
    if (direction === "up" && row > 0) next = current - cols;
    if (direction === "down" && current + cols < count) next = current + cols;
    else if (direction === "down" && (row + 1) * cols < count) next = count - 1;
    if (next === current) return;
    cursorRef.current = next;
    setCursor(next);
    playSound();
    if (isSingleSelect(currentStep)) applyFocusValue(next);
  }, [applyFocusValue, focusFooter, playSound]);

  const activate = useCallback(() => {
    const currentStep = stepRef.current;
    if (footerFocusRef.current !== null) {
      const action = footerFocusRef.current;
      rumble("confirm", settingsRef.current.haptic_feedback !== false);
      if (action === 0) goToStep(stepIndexRef.current - 1);
      else if (action === 2 || currentStep === "done") closeFlow();
      else goToStep(stepIndexRef.current + 1);
      return;
    }
    if (currentStep === "done") {
      rumble("confirm", settingsRef.current.haptic_feedback !== false);
      closeFlow();
      return;
    }
    if (isSingleSelect(currentStep)) {
      rumble("confirm", settingsRef.current.haptic_feedback !== false);
      applyFocusValue(cursorRef.current);
      goToStep(stepIndexRef.current + 1);
      return;
    }
    if (currentStep === "home") {
      const row = HOME_ROWS[cursorRef.current];
      if (row.kind === "toggle") {
        if (settingsRef.current.home_mode === "normal") return;
        const current = Boolean(settingsRef.current[row.key]);
        setDraft({ [row.key]: !current } as Partial<Settings>);
        playSoundAlt();
      } else {
        const current = row.options.indexOf(String(settingsRef.current[row.key]));
        const next = row.options[(current + 1) % row.options.length];
        setHomeMode(next);
        playSoundAlt();
      }
      return;
    }
    if (currentStep === "sources") {
      const row = SOURCE_ROWS[cursorRef.current];
      const current = Boolean(settingsRef.current[row.key]);
      sourcesChangedRef.current = true;
      setDraft({ [row.key]: !current } as Partial<Settings>);
      playSoundAlt();
      return;
    }
    if (currentStep === "accounts") {
      const row = ACCOUNT_ROWS[cursorRef.current];
      persistDraft();
      accountTouchedRef.current = true;
      playSoundAlt();
      onOpenAccount(row.key);
      return;
    }
    if (currentStep === "essentials") {
      const row = ESSENTIAL_ROWS[cursorRef.current];
      if (row.kind === "toggle") {
        const current = Boolean(settingsRef.current[row.key]);
        setDraft({ [row.key]: !current } as Partial<Settings>);
        playSoundAlt();
      } else {
        const current = row.options.indexOf(String(settingsRef.current[row.key]));
        const next = row.options[(current + 1) % row.options.length];
        setDraft({ [row.key]: next } as Partial<Settings>);
        playSoundAlt();
      }
    }
  }, [applyFocusValue, closeFlow, goToStep, onOpenAccount, persistDraft, playSoundAlt, setDraft, setHomeMode]);

  const horizontal = useCallback((direction: 1 | -1) => {
    const currentStep = stepRef.current;
    if (footerFocusRef.current !== null) {
      moveCursor(direction === 1 ? "right" : "left");
      return;
    }
    if (currentStep === "home") {
      const row = HOME_ROWS[cursorRef.current];
      if (row.kind === "cycle") {
        const current = row.options.indexOf(String(settingsRef.current[row.key]));
        const next = row.options[(current + direction + row.options.length) % row.options.length];
        setHomeMode(next);
        playSound();
        return;
      }
    }
    if (currentStep === "essentials") {
      const row = ESSENTIAL_ROWS[cursorRef.current];
      if (row.kind === "cycle") {
        const current = row.options.indexOf(String(settingsRef.current[row.key]));
        const next = row.options[(current + direction + row.options.length) % row.options.length];
        setDraft({ [row.key]: next } as Partial<Settings>);
        playSound();
        return;
      }
    }
    if (stepCols(currentStep) === 1) return;
    moveCursor(direction === 1 ? "right" : "left");
  }, [moveCursor, playSound, setDraft, setHomeMode]);

  const activateRef = useRef(activate);
  const closeFlowRef = useRef(closeFlow);
  const goToStepRef = useRef(goToStep);
  const horizontalRef = useRef(horizontal);
  const moveCursorRef = useRef(moveCursor);
  activateRef.current = activate;
  closeFlowRef.current = closeFlow;
  goToStepRef.current = goToStep;
  horizontalRef.current = horizontal;
  moveCursorRef.current = moveCursor;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (childModalOpenRef.current) return;
      if (event.key === "ArrowRight") horizontalRef.current(1);
      else if (event.key === "ArrowLeft") horizontalRef.current(-1);
      else if (event.key === "ArrowDown") moveCursorRef.current("down");
      else if (event.key === "ArrowUp") moveCursorRef.current("up");
      else if (event.key === "Enter") activateRef.current();
      else if (event.key === "Escape") goToStepRef.current(stepIndexRef.current - 1);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let raf = 0;
    let suppressFrames = 12;
    const last: Partial<GpState> = {};
    const pressTime: Record<string, number> = {};
    const repeating: Record<string, boolean> = {};

    const poll = (now: number) => {
      if (childModalOpenRef.current) {
        const childGamepad = getBestGamepad();
        if (childGamepad) Object.assign(last, readGpState(childGamepad));
        suppressFrames = 12;
        raf = requestAnimationFrame(poll);
        return;
      }
      if (suppressFrames > 0) {
        const gamepad = getBestGamepad();
        if (gamepad) Object.assign(last, readGpState(gamepad));
        suppressFrames -= 1;
        raf = requestAnimationFrame(poll);
        return;
      }
      const gamepad = getBestGamepad();
      if (gamepad) {
        const state = readGpState(gamepad);
        if (shouldHandleDirectionRepeat("ArrowRight", state, last, now, pressTime, repeating)) horizontalRef.current(1);
        if (shouldHandleDirectionRepeat("ArrowLeft", state, last, now, pressTime, repeating)) horizontalRef.current(-1);
        if (shouldHandleDirectionRepeat("ArrowDown", state, last, now, pressTime, repeating)) moveCursorRef.current("down");
        if (shouldHandleDirectionRepeat("ArrowUp", state, last, now, pressTime, repeating)) moveCursorRef.current("up");
        if (state.Enter && !last.Enter) activateRef.current();
        if (state.Escape && !last.Escape) {
          rumble("cancel", settingsRef.current.haptic_feedback !== false);
          goToStepRef.current(stepIndexRef.current - 1);
        }
        if (state.BumperRight && !last.BumperRight) goToStepRef.current(stepIndexRef.current + 1);
        if (state.BumperLeft && !last.BumperLeft) goToStepRef.current(stepIndexRef.current - 1);
        if (state.Start && !last.Start) goToStepRef.current(stepIndexRef.current + 1);
        if (state.ButtonY && !last.ButtonY) closeFlowRef.current();
        Object.assign(last, state);
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, []);

  const focusOutline = (isFocused: boolean, isActive: boolean) => ({
    outline: (isFocused || isActive) ? `2px solid ${accent.primary}` : "2px solid transparent",
    outlineOffset: isFocused ? 3 : 2,
    boxShadow: isFocused ? `0 0 18px ${accent.glow}0.45)` : "none",
  });

  const tileOutline = (focused: boolean, active: boolean) => focusOutline(footerFocus === null && focused, active);

  const focusCard = (index: number, preview = false) => {
    if (stepRef.current === "home" && index === 1 && settingsRef.current.home_mode === "normal") return;
    focusFooter(null);
    if (cursorRef.current === index) return;
    cursorRef.current = index;
    setCursor(index);
    if (preview) applyFocusValue(index);
  };

  useEffect(() => {
    const body = bodyRef.current;
    const row = body?.querySelectorAll<HTMLElement>(".lo-onb-card")[cursor];
    if (!body || !row || footerFocus !== null) return;
    const viewport = body.getBoundingClientRect();
    const rect = row.getBoundingClientRect();
    if (rect.top < viewport.top + 6) body.scrollTop -= viewport.top + 6 - rect.top;
    else if (rect.bottom > viewport.bottom - 6) body.scrollTop += rect.bottom - viewport.bottom + 6;
  }, [cursor, step, footerFocus]);

  const renderBody = () => {
    if (step === "welcome") {
      return (
        <>
          <div aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, margin: "2px 0 22px" }}>
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
              <path d="M16 2 L21 9 L22 19 Q22 22 19 22 L13 22 Q10 22 10 19 L11 9 Z" fill={accent.primary} />
              <circle cx="16" cy="13" r="3.5" fill="white" opacity="0.9" />
              <circle cx="16" cy="13" r="2" fill="#bde0ff" opacity="0.7" />
              <path d="M10 18 L5 25 L11 21 Z" fill={accent.dark} />
              <path d="M22 18 L27 25 L21 21 Z" fill={accent.dark} />
              <path d="M12 22 Q14 30 16 27 Q18 30 20 22" fill={accent.light} opacity="0.9" />
            </svg>
            <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: "0.04em", color: theme.text }}>LiftOff</span>
          </div>
          <div className="lo-onb-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
            {LANGUAGE_OPTIONS.map((key, index) => {
              const isActive = String(settings.language ?? "auto") === key;
              return (
                <div key={key} className="lo-onb-card" onClick={() => focusCard(index, true)} onDoubleClick={activate}
                  onMouseMove={() => focusCard(index, true)} style={{ padding: "18px 12px", textAlign: "center", cursor: "pointer", borderRadius: surfaceStyle === "win9x" ? 0 : 12, fontSize: 14, fontWeight: 600, color: theme.text, background: isActive ? `${accent.glow}0.14)` : "rgba(128,128,128,0.10)", ...tileOutline(cursor === index, isActive) }}>
                  {t(`settings.values.${key}`)}
                </div>
              );
            })}
          </div>
        </>
      );
    }

    if (step === "theme") {
      return (
        <div className="lo-onb-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
          {THEME_ITEMS.map((key, index) => {
            const isActive = normalizeThemeKey(String(settings.theme)) === key;
            const isFocused = cursor === index;
            return (
              <div key={key} className="lo-onb-card" onClick={() => focusCard(index, true)} onDoubleClick={activate}
                onMouseMove={() => focusCard(index, true)} style={{ position: "relative", overflow: "hidden", cursor: "pointer", borderRadius: surfaceStyle === "win9x" ? 0 : 12, ...tileOutline(isFocused, isActive) }}>
                <ThemePreview keyName={key} isLive={isFocused} accent={accent} />
                <div style={{ padding: "8px 10px", fontSize: 12, fontWeight: 700, color: theme.text, background: isDark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.6)" }}>
                  {t(`settings.values.${key}`)}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (step === "accent") {
      return (
        <div className="lo-onb-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0,1fr))", gap: 14 }}>
          {ACCENT_ITEMS.map((key, index) => {
            const config = ACCENTS[key];
            const isActive = settings.accent === key;
            return (
              <div key={key} className="lo-onb-card" onClick={() => focusCard(index, true)} onDoubleClick={activate}
                onMouseMove={() => focusCard(index, true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <div style={{ width: 52, height: 52, borderRadius: surfaceStyle === "win9x" ? 0 : "50%", background: `linear-gradient(135deg, ${config.light}, ${config.dark})`, ...tileOutline(cursor === index, isActive) }} />
                <span style={{ fontSize: 11, color: theme.textDim }}>{t(`settings.values.${key}`, key)}</span>
              </div>
            );
          })}
        </div>
      );
    }

    if (step === "surface") {
      return (
        <div className="lo-onb-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
          {SURFACE_ITEMS.map((key, index) => {
            const isActive = String(settings.surface_style ?? "clear") === key;
            return (
              <div key={key} className="lo-onb-card" onClick={() => focusCard(index, true)} onDoubleClick={activate}
                onMouseMove={() => focusCard(index, true)} style={{ padding: 12, cursor: "pointer", borderRadius: surfaceStyle === "win9x" ? 0 : 12, background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", ...tileOutline(cursor === index, isActive) }}>
                <div style={{ ...getMockRowStyle(key, isDark, accent.primary, accent.glow), padding: "10px 12px", fontSize: 11, marginBottom: 10 }}>
                  {t("settings.surfacePickerSample")}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: theme.text }}>{t(`settings.values.${key}`)}</div>
              </div>
            );
          })}
        </div>
      );
    }

    if (step === "accounts") {
      return (
        <div className="lo-onb-grid" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ACCOUNT_ROWS.map((row, index) => {
            const account = accounts[row.key] ?? { connected: false };
            return (
              <div key={row.key} className="lo-onb-card" onClick={() => { focusCard(index); activate(); }} onMouseMove={() => focusCard(index)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 18px", cursor: "pointer", borderRadius: surfaceStyle === "win9x" ? 0 : 12, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", ...tileOutline(cursor === index, false) }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{t(row.labelKey)}</span>
                  <span style={{ fontSize: 11, color: theme.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t(row.hintKey)}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: account.connected ? accent.primary : theme.textFaint, flexShrink: 0 }}>
                  {account.connected
                    ? (account.label ? `${t("onboarding.accounts.connected")} · ${account.label}` : t("onboarding.accounts.connected"))
                    : t("onboarding.accounts.connect")}
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    if (step === "home" || step === "sources" || step === "essentials") {
      const rows = step === "home" ? HOME_ROWS : step === "sources" ? SOURCE_ROWS : ESSENTIAL_ROWS;
      return (
        <div className="lo-onb-grid" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((row, index) => {
            const isCycle = "kind" in row && row.kind === "cycle";
            const value = settings[row.key];
            const disabled = step === "home" && row.key === "show_immersive_hero_art" && settings.home_mode === "normal";
            const shownValue = disabled ? true : Boolean(value);
            return (
              <div key={row.key} className="lo-onb-card" aria-disabled={disabled} data-disabled={disabled || undefined} onClick={() => { if (disabled) return; focusCard(index); activate(); }} onMouseMove={() => { if (!disabled) focusCard(index); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, padding: "14px 18px", cursor: disabled ? "not-allowed" : "pointer", borderRadius: surfaceStyle === "win9x" ? 0 : 12, background: disabled ? (isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)") : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", ...tileOutline(cursor === index && !disabled, false) }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: disabled ? theme.textDim : theme.text }}>{t(row.labelKey)}</span>
                {isCycle ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button type="button" aria-label={t("onboarding.previousOption")} onClick={(event) => { event.stopPropagation(); focusCard(index); horizontal(-1); }}
                        style={{ display: "grid", placeItems: "center", width: 28, height: 28, padding: 0, borderRadius: surfaceStyle === "win9x" ? 0 : 7, border: `1px solid ${theme.textFaint}`, background: "transparent", color: theme.text, cursor: "pointer" }}>
                        <IoChevronBack size={16} />
                      </button>
                      <span style={{ minWidth: 72, textAlign: "center", fontSize: 12, fontWeight: 700, color: accent.primary }}>{t(row.key === "home_mode" ? `settings.homeModeValues.${String(value)}` : `settings.values.${String(value)}`, String(value))}</span>
                      <button type="button" aria-label={t("onboarding.nextOption")} onClick={(event) => { event.stopPropagation(); focusCard(index); horizontal(1); }}
                        style={{ display: "grid", placeItems: "center", width: 28, height: 28, padding: 0, borderRadius: surfaceStyle === "win9x" ? 0 : 7, border: `1px solid ${theme.textFaint}`, background: "transparent", color: theme.text, cursor: "pointer" }}>
                        <IoChevronForward size={16} />
                      </button>
                    </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {disabled && (
                      <span style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 7px", borderRadius: surfaceStyle === "win9x" ? 0 : 999, border: `1px solid ${theme.textFaint}`, fontSize: 10, fontWeight: 700, color: theme.textDim, whiteSpace: "nowrap" }}>
                        <IoLockClosedOutline size={12} />
                        {t("onboarding.home.legacyHeroLocked")}
                      </span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 700, color: disabled ? theme.textDim : shownValue ? accent.primary : theme.textFaint }}>{shownValue ? t("onboarding.on") : t("onboarding.off")}</span>
                    <div style={{ opacity: disabled ? 0.55 : 1 }}>
                      <ToggleKnob value={shownValue} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div style={{ padding: "16px 4px", fontSize: 14, lineHeight: 1.7, color: theme.text }}>
        <p style={{ margin: "0 0 12px" }}>{t("onboarding.done.body")}</p>
        <p style={{ margin: 0, color: theme.textDim, fontSize: 13 }}>{t("onboarding.done.accounts")}</p>
      </div>
    );
  };

  const progressIndex = PROGRESS_STEPS.indexOf(step);
  const buttonStyle = {
    border: `1px solid ${accent.primary}`,
    borderRadius: surfaceStyle === "win9x" ? 0 : 9,
    padding: "7px 12px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  } as const;

  return (
    <div data-theme={resolvedTheme} data-ui-motion={settings.ui_motion === false ? "off" : "on"} className="lo-onb-overlay"
      style={{ ...modalOverlayStyle(childModalOpen ? 1500 : 9500), pointerEvents: childModalOpen ? "none" : "auto" }}>
      <div style={modalScrimStyle} />
      <div data-modal="" data-onboarding-step={step} className="lo-onb-panel" style={{ ...modalPanelStyle(themeValue, { width: "min(880px, 94vw)", maxHeight: "86vh", padding: "28px 28px 20px" }), display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: theme.text }}>{t(`onboarding.${step}.title`)}</span>
          <div style={{ display: "flex", gap: 6 }}>
            {PROGRESS_STEPS.map((progressStep, index) => (
              <div key={progressStep} style={{ width: index === progressIndex ? 18 : 6, height: 6, borderRadius: surfaceStyle === "win9x" ? 0 : 3, background: index <= progressIndex && progressIndex >= 0 ? accent.primary : theme.textFaint, transition: "width 0.2s ease, background 0.2s ease" }} />
            ))}
          </div>
        </div>
        <p style={{ fontSize: 12, color: theme.textDim, margin: "0 0 20px", lineHeight: 1.5 }}>{t(`onboarding.${step}.hint`)}</p>
        <div ref={bodyRef} key={step} className="lo-onb-step" style={{ overflowY: "auto", minHeight: 0, padding: 7, margin: -7 }}>{renderBody()}</div>
        <div style={{ display: "flex", flexShrink: 0, alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 22, paddingTop: 14, borderTop: `1px solid ${theme.textFaint}`, fontSize: 11, color: theme.textDim }}>
          <span style={{ flex: 1 }}>{t("onboarding.controls")}</span>
          <button type="button" data-onboarding-action="back" data-focused={footerFocus === 0} onFocus={() => focusFooter(0)} onMouseMove={() => stepIndex > 0 && focusFooter(0)} disabled={stepIndex === 0} onClick={() => goToStep(stepIndexRef.current - 1)} style={{ ...buttonStyle, ...focusOutline(footerFocus === 0, false), opacity: stepIndex === 0 ? 0.4 : 1, background: "transparent", color: theme.text }}>{t("common.back")}</button>
          <button type="button" data-onboarding-action="next" data-focused={footerFocus === 1} onFocus={() => focusFooter(1)} onMouseMove={() => focusFooter(1)} onClick={() => step === "done" ? closeFlow() : goToStep(stepIndexRef.current + 1)} style={{ ...buttonStyle, ...focusOutline(footerFocus === 1, false), background: accent.primary, color: accent.darkText ? "#161616" : "#fff" }}>{step === "done" ? t("common.done") : t("common.next")}</button>
          <button type="button" data-onboarding-action="skip" data-focused={footerFocus === 2} onFocus={() => focusFooter(2)} onMouseMove={() => focusFooter(2)} onClick={closeFlow} style={{ ...buttonStyle, ...focusOutline(footerFocus === 2, false), border: 0, background: "transparent", color: theme.textDim }}>{t("onboarding.skip")}</button>
        </div>
      </div>
    </div>
  );
}
