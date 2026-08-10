import { Check, Download, LoaderCircle, MessageCircle, Monitor, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { isMobileOrTabletDevice } from "../utils/whatsapp";
import { createWatermarkedJpegFile, desktopWhatsAppUrl, downloadPreparedFiles, nativeShareErrorMessage, photoShareMessage } from "../utils/photoShare";

const initialState = { open: false, stage: "register", name: "", email: "", contactNumber: "", openWhatsApp: false, busy: false, message: "", error: "" };

export function ShareSelectedPhotosButton({ listing, selectedPhotos }) {
  const [state, setState] = useState(initialState);
  const mobile = isMobileOrTabletDevice();
  const patchState = (values) => setState((current) => ({ ...current, ...values }));
  const close = () => setState((current) => ({ ...current, open: false, busy: false, error: "" }));

  useEffect(() => {
    if (!selectedPhotos.length) return;
    setState((current) => current.error === "Select at least one photo first."
      ? { ...current, error: "" }
      : current);
  }, [selectedPhotos.length]);

  const prepareFiles = async () => {
    patchState({ busy: true, message: "Preparing watermarked JPG photos…", error: "" });
    const files = [];
    for (let index = 0; index < selectedPhotos.length; index += 1) {
      files.push(await createWatermarkedJpegFile(selectedPhotos[index], { code: listing.code, index }));
      patchState({ message: `Preparing photo ${index + 1} of ${selectedPhotos.length}…` });
    }
    return files;
  };

  const recordShare = async (client) => {
    try {
      await fetch("/api/photo-share/event", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: listing.code, photoCount: selectedPhotos.length, client }),
      });
    } catch { /* Downloading/sharing should continue if audit recording is temporarily unavailable. */ }
  };

  const downloadSelected = async () => {
    try {
      const files = await prepareFiles();
      downloadPreparedFiles(files);
      await recordShare("download");
      patchState({ open: false, busy: false, message: "Selected watermarked JPG photos downloaded.", error: "" });
    } catch {
      patchState({ busy: false, message: "", error: "Unable to prepare these photos for downloading." });
    }
  };

  const shareNative = async () => {
    try {
      const files = await prepareFiles();
      if (!navigator.share || !navigator.canShare?.({ files })) {
        patchState({ open: true, stage: "choose", busy: false, openWhatsApp: true, message: "", error: "Direct file sharing is unavailable in this browser. Use one of the assisted WhatsApp options below." });
        return;
      }
      await navigator.share({ title: `${listing.code} photos`, text: photoShareMessage(listing), files });
      await recordShare("native");
      patchState({ open: false, busy: false, message: "Photos shared successfully.", error: "" });
    } catch (error) {
      if (error?.name === "AbortError") await recordShare("native");
      patchState({ busy: false, message: "", error: nativeShareErrorMessage(error) });
    }
  };

  const continueAfterRegistration = async () => {
    if (mobile) { await shareNative(); return; }
    if (state.openWhatsApp) patchState({ open: true, stage: "choose", busy: false, message: "", error: "" });
    else await downloadSelected();
  };

  const begin = async () => {
    if (!selectedPhotos.length) {
      patchState({ message: "", error: "Select at least one photo first." });
      return;
    }
    patchState({ busy: true, message: "Checking registration…", error: "" });
    try {
      const response = await fetch("/api/photo-share/session", { credentials: "include", cache: "no-store" });
      if (response.ok) {
        if (mobile) await shareNative();
        else patchState({ open: true, stage: "options", busy: false, message: "", error: "" });
        return;
      }
      patchState({ open: true, stage: "register", busy: false, message: "", error: response.status === 401 ? "" : "Photo sharing registration is unavailable." });
    } catch {
      patchState({ open: true, stage: "register", busy: false, message: "", error: "Photo sharing registration is unavailable." });
    }
  };

  const register = async (event) => {
    event.preventDefault();
    const normalizedContact = String(state.contactNumber || "").replace(/[\s().-]/g, "");
    if (!/^\+?[0-9]{8,15}$/.test(normalizedContact)) {
      patchState({ error: "Enter a valid contact number, for example 016-313 2865 or +60163132865." });
      return;
    }
    patchState({ busy: true, error: "", message: "Saving your details…" });
    try {
      const response = await fetch("/api/photo-share/session", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: state.name, email: state.email, contactNumber: state.contactNumber }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Please enter a valid name, email and contact number.");
      await continueAfterRegistration();
    } catch (error) {
      patchState({ busy: false, message: "", error: error.message || "Photo sharing registration is unavailable." });
    }
  };

  const continueDesktopOptions = async () => {
    if (state.openWhatsApp) patchState({ stage: "choose", error: "", message: "" });
    else await downloadSelected();
  };

  const openDesktopClient = async (client) => {
    const popup = window.open("about:blank", client === "web" ? "propertydealdesk-whatsapp-web" : "_blank");
    try {
      const files = await prepareFiles();
      downloadPreparedFiles(files);
      await recordShare(client);
      const url = desktopWhatsAppUrl(client, photoShareMessage(listing));
      if (popup) popup.location.href = url;
      else window.location.href = url;
      patchState({ busy: false, message: "JPG photos downloaded. Attach them separately in WhatsApp after it opens.", error: "" });
    } catch {
      popup?.close();
      patchState({ busy: false, message: "", error: "Unable to prepare these photos for sharing." });
    }
  };

  const whatsappCheckbox = <><label className="photo-share-checkbox"><input type="checkbox" checked={state.openWhatsApp} onChange={(event) => patchState({ openWhatsApp: event.target.checked })} /><span>Open WhatsApp after downloading</span></label>{state.openWhatsApp ? <p className="photo-share-remark">Reminder: WhatsApp cannot attach these files automatically on desktop. Please attach the downloaded JPG photos separately in the WhatsApp conversation.</p> : null}</>;

  let modalContent;
  if (state.stage === "register") {
    modalContent = <form onSubmit={register}><span className="eyebrow">{mobile ? "Photo sharing" : "Photo download"}</span><h2>{listing.code}</h2><p>Enter your name, email and contact number once to {mobile ? "share" : "download"} this SMI’s selected watermarked JPG photos.</p><label>Name<input required value={state.name} onChange={(event) => patchState({ name: event.target.value })} autoComplete="name" /></label><label>Email<input required type="email" value={state.email} onChange={(event) => patchState({ email: event.target.value })} autoComplete="email" /></label><label>Contact No.<input required type="tel" inputMode="tel" pattern="[+0-9 ().-]{8,24}" placeholder="016-313 2865" value={state.contactNumber} onChange={(event) => patchState({ contactNumber: event.target.value })} autoComplete="tel" /></label>{!mobile ? whatsappCheckbox : null}{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}<button className="button primary" type="submit" disabled={state.busy}>{state.busy ? <LoaderCircle className="spin" size={18} /> : <Check size={18} />}{state.busy ? state.message : "Continue"}</button></form>;
  } else if (state.stage === "options") {
    modalContent = <div className="photo-share-client-choice"><span className="eyebrow">Selected photos</span><h2>Download watermarked JPGs</h2><p>Your registration is already saved for this browser.</p>{whatsappCheckbox}<button className="button primary" type="button" onClick={continueDesktopOptions} disabled={state.busy}><Download size={18} /> {state.openWhatsApp ? "Continue" : "Download selected photos"}</button>{state.busy ? <p className="photo-share-progress"><LoaderCircle className="spin" size={16} /> {state.message}</p> : null}{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}</div>;
  } else {
    modalContent = <div className="photo-share-client-choice"><span className="eyebrow">Selected photos</span><h2>Choose WhatsApp</h2><p>The watermarked JPG files will download first. Please attach those downloaded photos separately after WhatsApp opens.</p><button className="button primary" type="button" onClick={() => openDesktopClient("app")} disabled={state.busy}><Smartphone size={18} /> WhatsApp App</button><button className="button secondary" type="button" onClick={() => openDesktopClient("web")} disabled={state.busy}><Monitor size={18} /> WhatsApp Web</button>{state.busy ? <p className="photo-share-progress"><LoaderCircle className="spin" size={16} /> {state.message}</p> : null}{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.message && !state.busy ? <p className="photo-share-success"><Check size={16} /> {state.message}</p> : null}</div>;
  }

  const modal = state.open ? <div className="photo-request-backdrop" role="dialog" aria-modal="true" aria-label="Selected property photos" onMouseDown={(event) => { if (event.target === event.currentTarget && !state.busy) close(); }}><div className="photo-request-modal"><button className="modal-close" type="button" onClick={close} aria-label="Close" disabled={state.busy}><X size={20} /></button>{modalContent}</div></div> : null;

  const hasSelection = selectedPhotos.length > 0;

  return <div className="selected-photo-share">
    {state.error && !state.open ? <span className="form-error" role="alert">{state.error}</span> : null}
    {state.message && !state.open && !state.busy ? <span role="status"><Check size={14} /> {state.message}</span> : null}
    <button className={`button photo-share-trigger ${hasSelection ? "primary is-ready" : "secondary"}`} type="button" onClick={begin} disabled={state.busy}>{mobile ? <MessageCircle className="photo-share-trigger-icon" size={17} /> : <Download className="photo-share-trigger-icon" size={17} />} {state.busy && !state.open ? state.message : mobile ? "Share selected photos to WhatsApp" : "Download selected photos"}</button>
    {typeof document !== "undefined" ? createPortal(modal, document.body) : null}
  </div>;
}
