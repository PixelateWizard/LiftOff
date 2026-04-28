import { createContext, useContext } from "react";
import type { GamepadPlatform } from "../components/ui/Gamepad";

export interface GamepadIconConfig {
  platform: GamepadPlatform;
  colored: boolean;
  filled: boolean;
  /** When set, bumpers/triggers use this accent color instead of the default light grey */
  themeColor?: string;
}

const DEFAULT: GamepadIconConfig = {
  platform: "xbox",
  colored: false,
  filled: true,
};

const GamepadContext = createContext<GamepadIconConfig>(DEFAULT);

export const PLATFORM_BTN_MAP: Record<GamepadPlatform, Record<string, string>> = {
  xbox:   {},
  ps:     { LT: "L2", RT: "R2", LB: "L1", RB: "R1" },
  switch: { LT: "ZL", RT: "ZR", LB: "L",  RB: "R"  },
};

export const useGamepadIcons = () => useContext(GamepadContext);

export function useGamepadLabel(btn: string) {
  const { platform } = useGamepadIcons();
  return PLATFORM_BTN_MAP[platform]?.[btn] ?? btn;
}

export const GamepadProvider = GamepadContext.Provider;
