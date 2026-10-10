"use client";

import {
  useEffect,
  useState,
} from "react";
import type {
  SubscriptionPlan,
} from "./types";

type BusinessPlanApiResponse = {
  business?: {
    business_name?: string;
    slug?: string;
    plan?: SubscriptionPlan;
    status?: string;
    billing_status?: string;
    trial_started_at?: string | null;
    trial_ends_at?: string | null;
    current_period_starts_at?: string | null;
    current_period_ends_at?: string | null;
    ciudad?: string | null;
    provincia?: string | null;
    pais?: string | null;
  };
  error?: string;
};

type BusinessPlanState = {
  businessName: string;
  slug: string;
  currentPlan: SubscriptionPlan;
  status: string;
  billingStatus: string;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  currentPeriodStartsAt: string | null;
  currentPeriodEndsAt: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
};

function isSubscriptionPlan(
  value: unknown
): value is SubscriptionPlan {
  return (
    value === "basic" ||
    value === "pro" ||
    value === "ultra"
  );
}

export function useBusinessPlan(
  slug: string | null
) {
  const [
    data,
    setData,
  ] =
    useState<BusinessPlanState | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState<boolean>(true);

  const [
    error,
    setError,
  ] =
    useState<string>("");

  useEffect(() => {
    let cancelled =
      false;

    async function run() {
      if (!slug) {
        setLoading(false);
        setError(
          "Falta slug del negocio"
        );
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            `/api/businesses/by-slug/${encodeURIComponent(
              slug
            )}/plan`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const raw =
          await response.text();

        let result:
          BusinessPlanApiResponse =
          {};

        if (raw) {
          try {
            result =
              JSON.parse(
                raw
              ) as BusinessPlanApiResponse;
          } catch {
            throw new Error(
              "La API devolvió HTML o una respuesta inválida."
            );
          }
        }

        if (!response.ok) {
          throw new Error(
            result.error ||
              "No se pudo cargar el plan del negocio"
          );
        }

        const business =
          result.business;

        if (!business) {
          throw new Error(
            "La respuesta del plan no contiene información del negocio."
          );
        }

        const currentPlan =
          isSubscriptionPlan(
            business.plan
          )
            ? business.plan
            : "basic";

        if (!cancelled) {
          setData({
            businessName:
              business.business_name ??
              "",
            slug:
              business.slug ??
              slug,
            currentPlan,
            status:
              business.status ??
              "",
            billingStatus:
              business.billing_status ??
              "",
            trialStartedAt:
              business.trial_started_at ??
              null,
            trialEndsAt:
              business.trial_ends_at ??
              null,
            currentPeriodStartsAt:
              business.current_period_starts_at ??
              null,
            currentPeriodEndsAt:
              business.current_period_ends_at ??
              null,
            ciudad:
              business.ciudad ??
              null,
            provincia:
              business.provincia ??
              null,
            pais:
              business.pais ??
              null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar plan"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled =
        true;
    };
  }, [slug]);

  return {
    data,
    loading,
    error,
  };
}