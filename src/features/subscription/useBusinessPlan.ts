"use client";

import { useEffect, useState } from "react";
import type { SubscriptionPlan } from "./types";

type BusinessPlanState = {
  businessName: string;
  slug: string;
  currentPlan: SubscriptionPlan;
  status: string;
  billingStatus: string;
};

export function useBusinessPlan(slug: string | null) {
  const [data, setData] = useState<BusinessPlanState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!slug) {
        setLoading(false);
        setError("Falta slug del negocio");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/businesses/by-slug/${slug}/plan`, {
          method: "GET",
          cache: "no-store",
        });
const raw = await response.text();

let result: any = {};

if (raw) {
  try {
    result = JSON.parse(raw);
  } catch {
    throw new Error("La API devolvió HTML o una respuesta inválida.");
  }
}

if (!response.ok) {
  throw new Error(result?.error || "No se pudo cargar el plan del negocio");
}
        if (!cancelled) {
          setData({
            businessName: result.business.business_name,
            slug: result.business.slug,
            currentPlan: result.business.plan,
            status: result.business.status,
            billingStatus: result.business.billing_status,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar plan");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return {
    data,
    loading,
    error,
  };
}