import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export function AdminNavLink() {
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("devAdmin") === "1" && ["127.0.0.1", "localhost"].includes(window.location.hostname)) {
      document.cookie = "pd_dev_admin=1; Path=/; SameSite=Lax";
      setAuthenticated(true);
    }
    let active = true;
    fetch("/api/admin/session", { cache: "no-store", credentials: "same-origin", headers: { accept: "application/json" } })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (active) setAuthenticated(payload?.authenticated === true); })
      .catch(() => { if (active) setAuthenticated(false); });
    return () => { active = false; };
  }, []);
  return authenticated ? <Link className="nav-admin" to="/admin/photo-grants">Admin</Link> : null;
}
