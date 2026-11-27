import { listingShortUrl } from "./listing.js";

// HASiL June 2026 guidance, item 49(a): full annual rent (no old RM2,400 deduction).
// SRO 2023 Second Schedule, tenancy <=3 years: 30% monthly rent, min RM500 up to RM10,000.
export function rentalMoveInEstimate(rent, months = 12, otherCharges = 0, legalQuote = "") {
  if ([rent, months, otherCharges].some(value => value === "" || value == null)) return null;
  const [r, m, other] = [rent, months, otherCharges].map(Number);
  if (![r,m,other].every(Number.isFinite) || r <= 0 || r > 1e7 || ![12,24,36].includes(m) || other < 0 || other > 1e7) return null;
  const hasQuote = String(legalQuote).trim() !== "";
  const quoted = Number(legalQuote);
  if (hasQuote && (!Number.isFinite(quoted) || quoted < 0 || quoted > 1e7)) return null;
  const legalFee = hasQuote ? quoted : r <= 10000 ? Math.max(500, r * .3) : null;
  const stampDuty = Math.max(10, Math.ceil(r * 12 / 250) * (m <= 12 ? 1 : 3));
  const copyDuty = 10; // One additional stamped counterpart assumed.
  const deposits = r * 3, advance = r;
  const stampingTotal = stampDuty + copyDuty;
  const agreementCosts = legalFee == null ? null : stampingTotal + legalFee + other;
  return { rentalDeposit: r * 2, utilityDeposit: r, advance, deposits, rentalSubtotal: deposits + advance, stampDuty, copyDuty, stampingTotal, legalFee, otherCharges: other, agreementCosts,
    upfront: agreementCosts == null ? null : deposits + advance + agreementCosts };
}

export function mortgageEstimate(price, margin, annualRate, years) {
  if ([price, margin, annualRate, years].some(value => value === "" || value == null)) return null;
  const [p, m, r, y] = [price, margin, annualRate, years].map(Number);
  if (![p, m, r, y].every(Number.isFinite) || p <= 0 || p > 1e9 || m < 0 || m > 100 || r < 0 || r > 20 || !Number.isInteger(y) || y < 1 || y > 40) return null;
  const principal = p * m / 100, months = y * 12, rate = r / 1200;
  const monthly = rate === 0 ? principal / months : principal * rate / -Math.expm1(-months * Math.log1p(rate));
  return { principal, downPayment: p - principal, monthly, interest: Math.max(0, monthly * months - principal) };
}

export function areaMapLinks(location) {
  const area = String(location || "").trim();
  if (!area || /^(n\/a|unknown|not specified)$/i.test(area)) return null;
  const query = /malaysia/i.test(area) ? area : `${area}, Malaysia`;
  return { google: `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query })}`,
    waze: `https://waze.com/ul?${new URLSearchParams({ q: query })}`,
    embed: `https://www.google.com/maps?${new URLSearchParams({ q: query, output: "embed" })}` };
}

// Standard Malaysian citizen/PR subsale illustration; no exemptions or negotiated discounts.
// Transfer duty: Stamp Act item 32(a). Legal fees: SRO 2023, First/Third Schedule Table A.
export function purchaseCosts(price, principal, monthly) {
  if (![price, principal, monthly].every(Number.isFinite) || price <= 0 || principal < 0 || principal > price || monthly < 0) return null;
  const tranche = (start, size, unit) => Math.ceil(Math.min(Math.max(0, price - start), size) / 100) * unit;
  const transferDuty = tranche(0, 100000, 1) + tranche(100000, 400000, 2) + tranche(500000, 500000, 3) + tranche(1000000, Infinity, 4);
  const legal = value => value === 0 ? 0 : value > 7500000 ? null : Math.max(500, Math.min(value, 500000) * .0125 + Math.max(0, value - 500000) * .01);
  const loanDuty = Math.ceil(principal / 1000) * 5;
  const spaLegal = legal(price), loanLegal = legal(principal);
  return { transferDuty, loanDuty, spaLegal, loanLegal,
    upfront: spaLegal == null || loanLegal == null ? null : price - principal + transferDuty + loanDuty + spaLegal + loanLegal,
    illustrativeIncome: monthly / .6 };
}

export function parseViewingDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value || "");
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}
export function formatViewingDateInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0,2), digits.slice(2,4), digits.slice(4)].filter(Boolean).join("/");
}
export function displayViewingDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}
export function validViewingTime(value) { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value || ""); }

export function malaysiaToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function validViewingDate(value, today = malaysiaToday()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= today;
}

export function viewingMessage(listing, { date, time, name = "", note = "", intent = listing.intent }, t = text => text, origin) {
  if (!validViewingDate(date) || !validViewingTime(time) || !name.trim()) return "";
  const url = new URL(listingShortUrl(listing, origin));
  const selectedIntent = [listing.intent, listing.alternateIntent].includes(intent) ? intent : listing.intent;
  url.searchParams.set("intent", selectedIntent);
  const details = [`${listing.displayCode || listing.code} · ${listing.title}`,
    `*${t("Preferred date")}:* ${displayViewingDate(date)}`, `*${t("Preferred time")}:* ${time} (MYT)`,
    `*${t("Name")}:* ${name.trim().slice(0, 80)}`, note.trim() && `*${t("Note")}:* ${note.trim().slice(0, 500)}`].filter(Boolean).join("\n");
  return [t("Hi HS Ong, I would like to request a viewing."), details,
    `${t("Please confirm availability and the appointment time.")}\n${url.href}`].join("\n\n");
}
