import { createContext, useContext, useState } from "react";
import { INQUIRY_LANGUAGES, normalizeInquiryLanguage, translateInquiry } from "../utils/inquiryLanguage";

const LanguageContext = createContext({ language: "en", t: text => text });
const STORAGE_KEY = "propertydealdesk-inquiry-language";
export const useInquiryLanguage = () => useContext(LanguageContext);

export function InquiryLanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try { return normalizeInquiryLanguage(localStorage.getItem(STORAGE_KEY)); } catch { return "en"; }
  });
  const changeLanguage = value => {
    const next = normalizeInquiryLanguage(value);
    setLanguage(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Switching still works when storage is blocked. */ }
  };
  const t = (text, values) => translateInquiry(language, text, values);
  return <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>{children}</LanguageContext.Provider>;
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
