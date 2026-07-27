import { X } from "lucide-react";
import { useEffect } from "react";
import { agentProfile } from "../config/agentProfile";

export function NameCardModal({ open, onClose }) {
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
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="name-card-modal" role="dialog" aria-modal="true" aria-labelledby="name-card-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">Professional details</span>
            <h2 id="name-card-title">{agentProfile.displayName}&apos;s name card</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close name card"><X size={20} /></button>
        </div>
        <img src={agentProfile.nameCard} alt={`${agentProfile.displayName} professional name card`} />
      </section>
    </div>
  );
}
