import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { SITE_ORIGIN } from "../utils/seo";

const fileName = (url, index) => `${String(url).split("/").pop()?.replace(/[^a-z0-9._-]/gi, "_") || `photo-${index + 1}.webp`}`;

export function ShareSelectedPhotosButton({ listing, selectedPhotos }) {
  const [state, setState] = useState({ busy: false, message: "" });
  const share = async () => {
    if (!selectedPhotos.length) { setState({ busy: false, message: "Select at least one photo first." }); return; }
    setState({ busy: true, message: "Preparing photos…" });
    try {
      const files = [];
      for (let index = 0; index < selectedPhotos.length; index += 1) {
        const response = await fetch(new URL(selectedPhotos[index], window.location.origin), { cache: "force-cache" });
        if (!response.ok) throw new Error("Photo unavailable");
        files.push(new File([await response.blob()], fileName(selectedPhotos[index], index), { type: response.headers.get("content-type") || "image/webp" }));
      }
      const data = { title: `${listing.code} photos`, text: `${listing.title}\n${SITE_ORIGIN}/i/${listing.code}` };
      if (navigator.share && navigator.canShare?.({ files })) {
        await navigator.share({ ...data, files });
        setState({ busy: false, message: "Photos ready to share." });
      } else {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${data.text}\n${selectedPhotos.map((photo) => new URL(photo, window.location.origin).toString()).join("\n")}`)}`;
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
        setState({ busy: false, message: "WhatsApp opened with the selected photo links." });
      }
    } catch (error) {
      setState({ busy: false, message: error?.name === "AbortError" ? "Share cancelled." : "Unable to prepare these photos for sharing." });
    }
  };
  return <div className="selected-photo-share"><button className="button secondary" type="button" onClick={share} disabled={state.busy}><Share2 size={17} /> {state.busy ? state.message : `Share ${selectedPhotos.length || "selected"} photo${selectedPhotos.length === 1 ? "" : "s"} to WhatsApp`}</button>{state.message && !state.busy ? <span role="status"><Check size={14} /> {state.message}</span> : null}</div>;
}
