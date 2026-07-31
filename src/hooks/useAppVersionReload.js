import { useEffect } from "react";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const MAIN_SCRIPT_PATTERN = /\/assets\/index-[^"']+\.js/;

export function currentAppScriptPath(documentRef = globalThis.document, origin = globalThis.location?.origin || "https://property.myeviv.com") {
  if (!documentRef?.querySelectorAll) return "";
  return [...documentRef.querySelectorAll('script[type="module"][src]')]
    .map((script) => new URL(script.getAttribute("src"), origin).pathname)
    .find((pathname) => MAIN_SCRIPT_PATTERN.test(pathname)) || "";
}

export function deployedAppScriptPath(html) {
  return html.match(MAIN_SCRIPT_PATTERN)?.[0] || "";
}

export function useAppVersionReload() {
  useEffect(() => {
    const currentScript = currentAppScriptPath();
    if (!currentScript) return undefined;

    let active = true;
    let checking = false;

    const checkForNewBuild = async () => {
      if (checking || document.visibilityState !== "visible") return;
      checking = true;
      try {
        const response = await fetch(`/?appVersion=${Date.now()}`, {
          cache: "no-store",
          headers: { Accept: "text/html" },
        });
        if (!response.ok) return;
        const deployedScript = deployedAppScriptPath(await response.text());
        if (active && deployedScript && deployedScript !== currentScript) {
          window.location.reload();
        }
      } catch {
        // Keep the current page usable if the lightweight version check fails.
      } finally {
        checking = false;
      }
    };

    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") checkForNewBuild();
    };

    const interval = window.setInterval(checkForNewBuild, CHECK_INTERVAL_MS);
    window.addEventListener("focus", checkForNewBuild);
    document.addEventListener("visibilitychange", checkWhenVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", checkForNewBuild);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, []);
}
