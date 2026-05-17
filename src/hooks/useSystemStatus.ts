import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface UseSystemStatusOptions {
  timeFormat: string;
  language: string;
  settingsRef: React.MutableRefObject<any>;
}

interface BatteryInfo {
  percent: number;
  charging: boolean;
}

export interface SystemStatus {
  time: string;
  date: string;
  battery: number;
  charging: boolean;
  hasBattery: boolean;
}

export function useSystemStatus({
  timeFormat,
  language,
  settingsRef,
}: UseSystemStatusOptions): SystemStatus {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [battery, setBattery] = useState(0);
  const [charging, setCharging] = useState(false);
  const [hasBattery, setHasBattery] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const locale = language || "en";
      const fmt = settingsRef.current.time_format;
      const use12 = fmt === "12h" || (fmt === "auto" && new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hour12);
      setTime(now.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", hour12: use12 }));
      setDate(now.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" }));
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [timeFormat, language, settingsRef]);

  useEffect(() => {
    const fetchBattery = () => {
      invoke<BatteryInfo>("get_battery").then(info => {
        if (info.percent > 0) {
          setBattery(info.percent);
          setHasBattery(true);
        }
        setCharging(info.charging);
      });
    };
    fetchBattery();
    const id = setInterval(fetchBattery, 10000);
    return () => clearInterval(id);
  }, []);

  return { time, date, battery, charging, hasBattery };
}
