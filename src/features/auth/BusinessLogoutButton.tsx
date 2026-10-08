"use client";

import { useState } from "react";

export function BusinessLogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/public/logout-business", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("No se pudo cerrar la sesión.");
      }

      try {
        const keysToRemove: string[] = [];

        for (
          let index = 0;
          index < window.localStorage.length;
          index += 1
        ) {
          const key = window.localStorage.key(index);

          if (key?.startsWith("jasodatos")) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach((key) => {
          window.localStorage.removeItem(key);
        });
      } catch {
        // La sesión del servidor ya fue cerrada.
      }

      try {
        await new Promise<void>((resolve) => {
          const request =
            window.indexedDB.deleteDatabase("jasodatos-local");

          request.onsuccess = () => {
            resolve();
          };

          request.onerror = () => {
            console.warn(
              "[logout-business] No se pudo eliminar IndexedDB."
            );
            resolve();
          };

          request.onblocked = () => {
            console.warn(
              "[logout-business] La eliminación de IndexedDB quedó bloqueada."
            );
            resolve();
          };
        });
      } catch {
        console.warn(
          "[logout-business] No se pudo limpiar IndexedDB."
        );
      }

      window.location.replace("/registro");
    } catch (logoutError) {
      console.error(
        "[logout-business] Error cerrando sesión:",
        logoutError
      );

      setIsLoggingOut(false);

      window.alert(
        "No se pudo cerrar la sesión. Inténtalo nuevamente."
      );
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      style={{
        minHeight: 40,
        padding: "0 18px",
        borderRadius: 12,
        border: "1px solid rgba(40, 53, 147, 0.28)",
        background: "#FFFFFF",
        color: "#283593",
        fontSize: "14px",
        fontWeight: 800,
        cursor: isLoggingOut ? "wait" : "pointer",
        opacity: isLoggingOut ? 0.7 : 1,
        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.08)",
      }}
    >
      {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
    </button>
  );
}
