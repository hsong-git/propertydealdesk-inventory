export const propertyPhotoWatermark = {
  lines: {
    title: "TRR HS Ong",
    subtitle: "property.myeviv.com",
  },
  mode: "overlay",
  opacity: 0.28,
};

export const shouldRenderBrowserWatermark = (config = propertyPhotoWatermark) => config.mode === "overlay";
