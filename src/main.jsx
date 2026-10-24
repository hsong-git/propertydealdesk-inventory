import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/theme.css";
import "./styles/site.css";
import { analyticsAttribution } from "./utils/analytics";

// Capture the entry URL before routing or filter state rewrites its query.
analyticsAttribution();

createRoot(document.getElementById("root")).render(
  <React.StrictMode><App /></React.StrictMode>,
);
