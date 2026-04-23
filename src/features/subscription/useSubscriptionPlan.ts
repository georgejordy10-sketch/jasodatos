"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SUBSCRIPTION_PLAN } from "./defaults";
import {
  PLAN_FEATURES,
  PLAN_LABELS,
  type PlanFeature,
  type SubscriptionPlan,
} from "./types";

const STORAGE_KEY = "jasodatos:subscription-plan:v1";

function safeParse(value: string | null): SubscriptionPlan {
  if (!value) return DEFAULT_SUBSCRIPTION_PLAN;

  try {
    const parsed = JSON.parse(value) as { currentPlan?: SubscriptionPlan };

    if (
      parsed.currentPlan === "basic" ||
      parsed.currentPlan === "pro" ||
      parsed.currentPlan === "ultra"
    ) {
      return parsed.currentPlan;
    }

    return DEFAULT_SUBSCRIPTION_PLAN;
  } catch {
    return DEFAULT_SUBSCRIPTION_PLAN;
  }
}

export function useSubscriptionPlan() {
  const [currentPlan, setCurrentPlanState] = useState<SubscriptionPlan>(
    DEFAULT_SUBSCRIPTION_PLAN
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = safeParse(window.localStorage.getItem(STORAGE_KEY));
    setCurrentPlanState(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ currentPlan })
    );
  }, [currentPlan, hydrated]);

  function setCurrentPlan(plan: SubscriptionPlan) {
    setCurrentPlanState(plan);
  }

  function hasFeature(feature: PlanFeature): boolean {
    return PLAN_FEATURES[currentPlan].includes(feature);
  }

  return {
    currentPlan,
    setCurrentPlan,
    hasFeature,
    planLabel: PLAN_LABELS[currentPlan],
  };
}