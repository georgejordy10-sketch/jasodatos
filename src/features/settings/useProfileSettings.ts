"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PROFILE_SETTINGS } from "./defaults";
import type { ChannelKey, CurrencyCode, ProfileSettings } from "./types";

const STORAGE_KEY = "jasodatos:commercial-profile-settings:v1";

function symbolToCurrencyCode(symbol?: string): CurrencyCode {
  if (symbol === "€") return "EUR";
  if (symbol === "S/") return "PEN";
  if (symbol === "COP$") return "COP";
  if (symbol === "MX$") return "MXN";
  return "USD";
}

function safeParse(value: string | null): ProfileSettings | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<ProfileSettings> & {
      currencySymbol?: string;
    };

    return {
      ...DEFAULT_PROFILE_SETTINGS,
      ...parsed,
      currencyCode:
        parsed.currencyCode ??
        symbolToCurrencyCode(parsed.currencySymbol),
      channelsEnabled: {
        ...DEFAULT_PROFILE_SETTINGS.channelsEnabled,
        ...(parsed.channelsEnabled ?? {}),
      },
    };
  } catch {
    return null;
  }
}

export function useProfileSettings() {
  const [settings, setSettings] = useState<ProfileSettings>(DEFAULT_PROFILE_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = safeParse(window.localStorage.getItem(STORAGE_KEY));
    if (stored) {
      setSettings(stored);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, hydrated]);

  function updateSettings(patch: Partial<ProfileSettings>) {
    setSettings((prev) => ({
      ...prev,
      ...patch,
      channelsEnabled: patch.channelsEnabled
        ? { ...prev.channelsEnabled, ...patch.channelsEnabled }
        : prev.channelsEnabled,
    }));
  }

  function updateThreshold(field: "salesDropMediumPct" | "salesDropHighPct", value: number) {
    updateSettings({ [field]: Number.isFinite(value) ? value : 0 } as Partial<ProfileSettings>);
  }

  function updateChannel(channel: ChannelKey, enabled: boolean) {
    setSettings((prev) => ({
      ...prev,
      channelsEnabled: {
        ...prev.channelsEnabled,
        [channel]: enabled,
      },
    }));
  }

  function resetSettings() {
    setSettings(DEFAULT_PROFILE_SETTINGS);
  }

  return {
    settings,
    hydrated,
    updateSettings,
    updateThreshold,
    updateChannel,
    resetSettings,
  };
}