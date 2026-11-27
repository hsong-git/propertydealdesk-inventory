import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useSiteLanguage } from "./InquiryLanguage";

export function FirstTimeEnquiryDialog({ open, onClose, onFirstTime, onReturning }) {
  const dialog = useRef(null);
  const { t } = useSiteLanguage();
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return <dialog ref={dialog} className="enquiry-prompt" onCancel={onClose} onClick={event => { if (event.target === dialog.current) onClose(); }} aria-labelledby="enquiry-prompt-title" aria-describedby="enquiry-prompt-description">
    <button className="icon-button enquiry-prompt-close" type="button" onClick={onClose} aria-label={t("Close")}><X size={20} /></button>
    <h2 id="enquiry-prompt-title">{t("Is this your first enquiry with HS Ong?")}</h2>
    <p id="enquiry-prompt-description">{t("If yes, share your requirements first. This property's details will be included with your submission.")}</p>
    <div className="enquiry-prompt-actions"><button className="button primary" type="button" onClick={onFirstTime}>{t("Yes, first time")}</button><button className="button secondary" type="button" onClick={onReturning}>{t("No, open WhatsApp")}</button></div>
  </dialog>;
}
