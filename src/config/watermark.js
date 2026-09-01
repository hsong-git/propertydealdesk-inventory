export const propertyPhotoWatermark = {
  logo: "/branding/Logo-GrayScale.png",
  lines: { title: "TRR HS Ong", subtitle: "property.myeviv.com" },
  mode: "overlay",
  opacity: 0.3,
};

export const shouldRenderBrowserWatermark = (config = propertyPhotoWatermark) => config.mode === "overlay";
