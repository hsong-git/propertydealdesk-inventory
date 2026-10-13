export function listingMediaLinks(listing, propertyHref) {
  const separator = propertyHref.includes("?") ? "&" : "?";
  return [
    ...(listing.layouts?.length ? [{ label: "Layout", media: "layout", href: `${propertyHref}${separator}media=layout` }] : []),
    ...(listing.videos?.length ? [{ label: "Video", media: "videos", href: `${propertyHref}${separator}media=videos` }] : []),
  ];
}

export function initialListingGallery(listing, requestedMedia) {
  if (requestedMedia === "layout" && listing?.layouts?.length) return "layout";
  if (requestedMedia === "videos" && listing?.videos?.length) return "videos";
  return "photos";
}
