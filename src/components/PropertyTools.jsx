import { useState } from "react";
import { CalendarDays, Info, MapPin, MessageCircle } from "lucide-react";
import { agentProfile } from "../config/agentProfile.js";
import { openWhatsApp } from "../utils/whatsapp.js";
import { postingFootnoteOrigin } from "../utils/listing.js";
import { areaMapLinks, mortgageEstimate, purchaseCosts, rentalMoveInEstimate, malaysiaToday, displayViewingDate, formatViewingDateInput, parseViewingDate, validViewingDate, validViewingTime, viewingMessage } from "../utils/propertyTools.js";
import { trackEvent } from "../utils/analytics.js";
import { useInquiryLanguage } from "./InquiryLanguage";

export function ViewingRequest({ listing, intent }) {
  const { t } = useInquiryLanguage();
  const [date, setDate] = useState(""); const [time, setTime] = useState("");
  const [name, setName] = useState(""); const [note, setNote] = useState(""); const [status, setStatus] = useState("");
  const [dateTouched, setDateTouched] = useState(false);
  const isoDate = parseViewingDate(date);
  const dateError = date && (date.length === 10 || dateTouched) && !validViewingDate(isoDate)
    ? validViewingDate(isoDate, "0000-00-00") ? "Choose today or a future date." : "Enter a valid date as dd/mm/yyyy, today or later." : "";
  const submit = event => {
    event.preventDefault();
    const isoDate = parseViewingDate(date);
    if (!validViewingDate(isoDate)) { setStatus("Enter a valid date as dd/mm/yyyy, today or later."); return; }
    if (!validViewingTime(time) || !name.trim()) { setStatus("Please enter your name and choose a time."); return; }
    const message = viewingMessage(listing, { date: isoDate, time, name, note, intent }, t, postingFootnoteOrigin());
    if (!message) return;
    // No names, notes, dates or phone numbers are sent to general analytics.
    trackEvent("whatsapp_click", { listingCode: listing.code, intent, properties: { placement: "viewing_request" } });
    setStatus("WhatsApp will open. Send the message to request a viewing; the appointment is not confirmed yet.");
    openWhatsApp({ phone: agentProfile.whatsapp, message, onError: () => setStatus("Unable to open WhatsApp. Please use the enquiry button or call HS Ong.") });
  };
  return <section id="viewing-request" className="viewing-request property-tool"><h2>{t("Request a viewing")}</h2><form onSubmit={submit}>
    <p>{t("Choose a preferred time. HS Ong will confirm availability with you.")}</p>
    <div className="viewing-date-field"><label htmlFor="viewing-date-text">{t("Preferred date")}</label><div className="viewing-date-inputs"><input id="viewing-date-text" type="text" inputMode="numeric" placeholder="dd/mm/yyyy" pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" maxLength={10} required value={date} aria-invalid={Boolean(dateError)} aria-describedby={dateError ? "viewing-date-error" : undefined} onBlur={() => setDateTouched(true)} onChange={e => { setDate(formatViewingDateInput(e.target.value)); setStatus(""); }} /><span className="viewing-calendar"><CalendarDays size={19} aria-hidden="true" /><input type="date" aria-label={t("Choose viewing date")} min={malaysiaToday()} value={validViewingDate(parseViewingDate(date)) ? parseViewingDate(date) : ""} onClick={e => { try { e.currentTarget.showPicker?.(); } catch { /* Native input remains available. */ } }} onInput={e => { setDate(displayViewingDate(e.currentTarget.value)); setStatus(""); }} onChange={e => { setDate(displayViewingDate(e.target.value)); setStatus(""); }} /></span></div>{dateError ? <small id="viewing-date-error" className="viewing-date-error" role="alert">{t(dateError)}</small> : null}</div>
    <label>{t("Preferred time (Malaysia time)")}<input type="time" required step="60" value={time} onInput={e => setTime(e.currentTarget.value)} onChange={e => setTime(e.target.value)} /></label>
    <label>{t("Name")}<input required autoComplete="name" maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label>
    <label>{t("Note (optional)")}<textarea maxLength={500} rows={2} value={note} onChange={e => setNote(e.target.value)} /></label>
    <button className="button primary" type="submit"><MessageCircle size={17} />{t("Request Viewing")}</button>
    {status ? <p role="status">{t(status)}</p> : null}
  </form></section>;
}

export function PropertyMapLinks({ listing }) {
  const { t } = useInquiryLanguage(); const links = areaMapLinks(listing.location);
  if (!links) return null;
  return <section className="detail-section property-location-links"><h2><MapPin size={18} /> {t("Explore the location")}</h2><p>{listing.location}</p>
    <iframe className="property-map-embed" title={t("Area map")} src={links.embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
    <p className="text-muted">{t("Area search only, not an exact property pin. Confirm the viewing address with HS Ong.")}</p>
    <div className="property-tool-actions">{[["Google Maps", links.google], ["Waze", links.waze]].map(([provider, href]) => <a key={provider} className="button secondary" href={href} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("media_open", { listingCode: listing.code, intent: listing.intent, properties: { media: "map", provider } })}>{provider}</a>)}</div>
  </section>;
}

export function MortgageEstimate({ price }) {
  const { t, language } = useInquiryLanguage();
  const [showDsrInfo, setShowDsrInfo] = useState(false);
  const [amount, setAmount] = useState(String(price)); const [margin, setMargin] = useState("90");
  const [rate, setRate] = useState("4"); const [years, setYears] = useState("35");
  const estimate = mortgageEstimate(amount, margin, rate, years);
  const costs = estimate ? purchaseCosts(Number(amount), estimate.principal, estimate.monthly) : null;
  const money = value => new Intl.NumberFormat(language === "zh" ? "zh-MY" : language === "ms" ? "ms-MY" : "en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 }).format(value);
  return <section className="detail-section mortgage-estimate property-tool"><h2>{t("Mortgage estimate")}</h2>
    <div className="mortgage-fields">
    {[["Property price (RM)", amount, setAmount, 1, 1e9, "1"], ["Loan margin (%)", margin, setMargin, 0, 100, "1"], ["Annual interest rate (%)", rate, setRate, 0, 20, "0.01"], ["Loan tenure (years)", years, setYears, 1, 40, "1"]].map(([label, value, set, min, max, step]) => <label key={label}>{t(label)}<input type="number" inputMode="decimal" min={min} max={max} step={step} value={value} onChange={e => set(e.target.value)} /></label>)}</div>
    {estimate && costs ? <div className="mortgage-breakdown" aria-live="polite">
      <p className="mortgage-monthly"><span>{t("Monthly instalment")}</span><strong>{money(estimate.monthly)} {t("/ month")}</strong></p>
      <dl className="mortgage-financing"><div><dt>{t("Loan amount")}</dt><dd>{money(estimate.principal)}</dd></div></dl>
      <section className="mortgage-cash-group" aria-labelledby="mortgage-cash-heading"><h3 id="mortgage-cash-heading">{t("Upfront cash breakdown")}</h3><dl>
        {[["Down payment", estimate.downPayment], ["Stamp duty (transfer)", costs.transferDuty], ["Stamp duty (loan, 0.5%)", costs.loanDuty], ["Legal fee SPA (est.)", costs.spaLegal], ["Legal fee loan (est.)", costs.loanLegal]].map(([label,value]) => <div key={label}><dt>{t(label)}</dt><dd>{value == null ? t("Ask a solicitor") : money(value)}</dd></div>)}
        <div className="mortgage-upfront"><dt>{t("Estimated cash upfront")}</dt><dd>{costs.upfront == null ? t("Ask a solicitor") : money(costs.upfront)}</dd></div>
      </dl></section>
      <dl className="mortgage-income"><div><dt>{t("Illustrative income at 60% DSR")}<button type="button" className="dsr-info-button" aria-label={t("About the 60% DSR income estimate")} aria-expanded={showDsrInfo} aria-controls={showDsrInfo ? "mortgage-dsr-help" : undefined} onClick={() => setShowDsrInfo(value => !value)} onKeyDown={event => { if (event.key === "Escape") setShowDsrInfo(false); }}><Info size={16} aria-hidden="true" /></button></dt><dd>{money(costs.illustrativeIncome)} {t("/ month")}</dd></div></dl>
      {showDsrInfo ? <p id="mortgage-dsr-help" className="dsr-help">{t("DSR (Debt Service Ratio) is the share of monthly income used for debt repayments. This estimate divides the mortgage payment by 60%, assuming no other debts. Banks also consider your other commitments; this is not a salary requirement or loan approval.")}</p> : null}
    </div> : <p role="status">{t("Enter valid amounts within the limits shown.")}</p>}
    <p className="text-muted estimate-description">{t("For estimation only. Stamp duty follows the standard scale; eligible first-home buyers may receive exemptions. Your bank determines the final loan margin and interest rate.")}</p>
  </section>;
}

export function RentalMoveInEstimate({ price }) {
  const { t, language } = useInquiryLanguage();
  const [rent, setRent] = useState(String(price));
  const [months, setMonths] = useState("12");
  const estimate = rentalMoveInEstimate(rent, months);
  const money = value => new Intl.NumberFormat(language === "zh" ? "zh-MY" : language === "ms" ? "ms-MY" : "en-MY", { style: "currency", currency: "MYR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  return <section className="detail-section rental-estimate property-tool"><h2>{t("Rental move-in estimate")}</h2>
    <div className="mortgage-fields">
      <label>{t("Monthly rent (RM)")}<input type="number" min="1" max="10000000" step="0.01" inputMode="decimal" value={rent} onChange={e => setRent(e.target.value)} /></label>
      <label>{t("Tenancy term")}<select value={months} onChange={e => setMonths(e.target.value)}>{[12,24,36].map(value => <option key={value} value={value}>{t("{months} months", {months:value})}</option>)}</select></label>
    </div>
    {estimate ? <div className="mortgage-breakdown" aria-live="polite"><p className="mortgage-monthly"><span>{t("Estimated move-in cash")}</span><strong>{estimate.upfront == null ? t("Legal fee quote needed") : money(estimate.upfront)}</strong></p>
      <section className="rental-cost-group"><h3>{t("Deposits & advance rental")}</h3><dl>
        {[["Rental deposit (2 months)",estimate.rentalDeposit,true],["Utility deposit (1 month)",estimate.utilityDeposit,true],["Advance rental (1 month)",estimate.advance,false]].map(([label,value,refundable]) => <div key={label}><dt>{t(label)}{refundable ? <small className="refundable-label">{t("Refundable")}</small> : null}</dt><dd>{money(value)}</dd></div>)}
        <div className="mortgage-upfront"><dt>{t("Deposits & advance subtotal")}</dt><dd>{money(estimate.rentalSubtotal)}</dd></div>
      </dl></section>
      <section className="rental-cost-group"><h3>{t("TA & legal fees")}</h3><dl>
        {[["TA stamping",estimate.stampingTotal],["TA preparation / legal fee",estimate.legalFee]].map(([label,value]) => <div key={label}><dt>{t(label)}</dt><dd>{value == null ? t("Quote needed") : money(value)}</dd></div>)}
        <div className="mortgage-upfront"><dt>{t("TA & legal fees subtotal")}</dt><dd>{estimate.agreementCosts == null ? t("Quote needed") : money(estimate.agreementCosts)}</dd></div>
      </dl></section>
    </div> : <p role="status">{t("Enter valid amounts within the limits shown.")}</p>}
    <p className="text-muted estimate-description rental-booking-note">{t("A booking fee equivalent to 1 month’s rent plus 8% SST is payable to secure the unit. The remaining balance is payable upon signing the Tenancy Agreement (TA) and unit handover.")}</p>
    <div className="mortgage-sources"><a href="https://www.easylaw.com.my/app/calculator/tenancy_output" target="_blank" rel="noopener noreferrer">{t("Reference: EasyLaw tenancy calculator")}</a></div>
  </section>;
}
