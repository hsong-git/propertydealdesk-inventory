import { CATALOGUE_ORIGIN } from "./catalogueSite.js";

export const propertyPhotoWatermark = {
  logo: "/branding/Logo-Transparent.png",
  lines: { title: "TRR HS Ong", subtitle: new URL(CATALOGUE_ORIGIN).hostname },
  mode: "overlay",
  opacity: 0.3,
};

export const shouldRenderBrowserWatermark = (config = propertyPhotoWatermark) => config.mode === "overlay";
