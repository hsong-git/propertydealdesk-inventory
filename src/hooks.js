import { useEffect, useState } from "react";
import { normalizeInventoryFeed } from "./data/inventoryContract";
import { INVENTORY_REFRESH_INTERVAL_MS, inventoryFeedUrl } from "./data/inventoryRefresh";

export function useInventory() {
  const [state, setState] = useState({ items: [], meta: null, loading: true, error: "" });

  useEffect(() => {
    let active = true;
    let controller;
    let requestId = 0;

    const loadInventory = async () => {
      const currentRequestId = ++requestId;
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch(inventoryFeedUrl(), {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("The public inventory could not be loaded.");
        const payload = await response.json();
        const { items, meta } = normalizeInventoryFeed(payload);
        if (active && currentRequestId === requestId) {
          setState({ items, meta, loading: false, error: "" });
        }
      } catch (error) {
        if (error.name === "AbortError" || !active || currentRequestId !== requestId) return;
        setState((previous) => previous.meta
          ? { ...previous, loading: false }
          : { items: [], meta: null, loading: false, error: error.message });
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") loadInventory();
    };

    loadInventory();
    const interval = window.setInterval(loadInventory, INVENTORY_REFRESH_INTERVAL_MS);
    window.addEventListener("focus", loadInventory);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", loadInventory);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  return state;
}
