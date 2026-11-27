export function propertyEnquiryTarget(listing, intent) {
  return `/inquiries?${new URLSearchParams({ property: listing.slug, intent })}`;
}

export function propertyInterest(items, slug, intent, origin) {
  const listing = items.find(item => item.slug === slug);
  if (!listing) return null;
  const selectedIntent = [listing.intent, listing.alternateIntent].includes(intent) ? intent : listing.intent;
  return {
    interestCode: listing.displayCode || listing.code,
    interestTitle: listing.title,
    interestUrl: `${origin}/property/${encodeURIComponent(listing.slug)}?intent=${selectedIntent}`,
  };
}

export function propertyInterestLines(requirements) {
  return requirements.interestCode ? [`*Property code:* ${requirements.interestCode}`, `*Property title:* ${requirements.interestTitle}`, `*Property URL:* ${requirements.interestUrl}`] : [];
}
