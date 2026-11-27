import { useSiteLanguage } from "./InquiryLanguage";
import { X } from "lucide-react";
import { useEffect } from "react";

export function PortraitModal({ open, src, alt, onClose }) {
  const { t: tSite } = useSiteLanguage();
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("modal-open");
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop portrait-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="portrait-modal" role="dialog" aria-modal="true" aria-label={tSite("Enlarged profile portrait")} onMouseDown={(event) => event.stopPropagation()}>
        <button className="icon-button portrait-modal-close" type="button" onClick={onClose} aria-label={tSite("Close enlarged portrait")}><X size={20} /></button>
        <img src={src} alt={tSite(alt)} />
      </section>
    </div>
  );
}
