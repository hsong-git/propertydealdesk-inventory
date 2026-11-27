import { createContext, useContext, useEffect, useState } from "react";
import { INQUIRY_LANGUAGES, normalizeInquiryLanguage, preferredInquiryLanguage } from "../utils/inquiryLanguage";
import { translateSite } from "../utils/siteLanguage.js";

const LanguageContext = createContext({ language: "en", t: text => text });
const STORAGE_KEY = "propertydealdesk-inquiry-language";
const browserLanguage = saved => preferredInquiryLanguage(saved, globalThis.navigator?.languages, globalThis.navigator?.language);
export const useInquiryLanguage = () => useContext(LanguageContext);
export const useSiteLanguage = useInquiryLanguage;

export function InquiryLanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    let saved;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* Device preference still works when storage is blocked. */ }
    return browserLanguage(saved);
  });
  const changeLanguage = value => {
    const next = normalizeInquiryLanguage(value);
    setLanguage(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Switching still works when storage is blocked. */ }
  };
  useEffect(() => { document.documentElement.lang = language === "zh" ? "zh-Hans" : language; }, [language]);
  useEffect(() => { const sync = event => { if (event.key === STORAGE_KEY || event.key === null) setLanguage(browserLanguage(event.newValue)); }; window.addEventListener("storage", sync); return () => window.removeEventListener("storage", sync); }, []);
  const t = (text, values) => translateSite(language, text, values);
  return <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function SiteLanguagePicker() {
  const { language, setLanguage, t } = useInquiryLanguage();
  return <label className="site-language-picker"><span className="sr-only">{t("Language")}</span><select aria-label={t("Language")} value={language} onChange={event => setLanguage(event.target.value)}>
    <option value="en">English</option><option value="ms">Bahasa Melayu</option><option value="zh">中文</option>
  </select></label>;
}

export function InquiryLanguagePicker() {
  const { language, setLanguage, t } = useInquiryLanguage();
  return <nav className="inquiry-language-picker" aria-label={t("Language")}>
    <span>{t("Language")}</span>
    <div>{INQUIRY_LANGUAGES.map(item => <button type="button" key={item.value} lang={item.locale} aria-pressed={language === item.value} onClick={() => setLanguage(item.value)}>{item.label}</button>)}</div>
  </nav>;
}

export function InquiryText({ text }) {
  const { t } = useInquiryLanguage();
  return t(text);
}
