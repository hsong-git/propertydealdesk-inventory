import { useEffect, useState } from "react";
import { normalizeInventoryFeed } from "./data/inventoryContract";

export function useInventory() {
  const [state, setState] = useState({ items: [], meta: null, loading: true, error: "" });

  useEffect(() => {
    let active = true;
    fetch("/data/inventory.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("The public inventory could not be loaded.");
        return response.json();
      })
      .then((payload) => {
        const { items, meta } = normalizeInventoryFeed(payload);
        if (active) setState({ items, meta, loading: false, error: "" });
      })
      .catch((error) => active && setState({ items: [], meta: null, loading: false, error: error.message }));
    return () => { active = false; };
  }, []);

  return state;
}
