"use client";

import { useEffect } from "react";

const BUSINESS_SLUG_STORAGE_KEY = "jasodatos.currentBusinessSlug";

export default function HomePage() {
  useEffect(() => {
    const storedBusinessSlug =
      window.localStorage.getItem(BUSINESS_SLUG_STORAGE_KEY)?.trim() ?? "";

    if (storedBusinessSlug) {
      window.location.replace(
        `/cargas?business=${encodeURIComponent(storedBusinessSlug)}`
      );
      return;
    }

    window.location.replace("/registro");
  }, []);

  return null;
}