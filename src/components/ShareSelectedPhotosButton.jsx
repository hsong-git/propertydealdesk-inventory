import { useSiteLanguage } from "./InquiryLanguage";
import { Check, Download, LoaderCircle, MessageCircle, Monitor, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { isMobileOrTabletDevice } from "../utils/whatsapp";
import { createWatermarkedJpegFile, desktopWhatsAppUrl, downloadPreparedFiles, nativeShareErrorMessage, PHOTO_SELECTION_LIMIT } from "../utils/photoShare";
import { trackEvent } from "../utils/analytics";

const initialState = { open: false, stage: "options", openWhatsApp: false, busy: false, message: "", error: "" };

export function ShareSelectedPhotosButton({ listing, selectedPhotos = [], layoutIndex }) {
  const { t: tSite } = useSiteLanguage();
  const [state, setState] = useState(initialState);
  const [layoutFile, setLayoutFile] = useState(null);
  const sharingLayout = Number.isInteger(layoutIndex);
  const layout = sharingLayout ? listing.layouts?.[layoutIndex] : null;
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
    if (sharingLayout) {
      if (layoutFile) return [layoutFile];
      if (!layout) throw new Error("This layout is no longer published.");
      patchState({ busy: true, message: "Preparing layout JPG…", error: "" });
      const file = await createWatermarkedJpegFile(layout, {
        code: listing.code, index: layoutIndex, inventoryVersion: listing.inventoryVersion, media: "layout",
      });
      setLayoutFile(file);
      return [file];
    }
    const publishedPhotos = new Set(listing.photos || []);
    const photos = selectedPhotos
      .filter((photo) => publishedPhotos.has(photo))
      .slice(0, PHOTO_SELECTION_LIMIT);
    if (!photos.length) throw new Error("The selected photos are no longer published.");
    patchState({ busy: true, message: "Preparing JPG photos…", error: "" });
    const files = [];
    for (let index = 0; index < photos.length; index += 1) {
      files.push(await createWatermarkedJpegFile(photos[index], {
        code: listing.code,
        index,
        inventoryVersion: listing.inventoryVersion,
      }));
      patchState({ message: `Preparing photo ${index + 1} of ${photos.length}…` });
    }
    return files;
  };

  const recordShare = async (client) => {
    const count = sharingLayout ? 1 : selectedPhotos.length;
    trackEvent("photo_share", { listingCode: listing.code, intent: listing.intent, properties: { client, photo_count: count, ...(sharingLayout ? { media: "layout" } : {}) } });
    try {
      await fetch("/api/photo-share/event", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: listing.code, photoCount: count, client }),
      });
    } catch { /* Downloading/sharing should continue if audit recording is temporarily unavailable. */ }
  };

  const downloadSelected = async () => {
    try {
      const files = await prepareFiles();
      downloadPreparedFiles(files);
      await recordShare("download");
      patchState({ open: false, busy: false, message: sharingLayout ? "Layout JPG downloaded." : "Selected JPG photos downloaded.", error: "" });
    } catch {
      patchState({ busy: false, message: "", error: sharingLayout ? "Unable to download this layout." : "Unable to prepare these photos for downloading." });
    }
  };

  const shareNative = async () => {
    try {
      const files = await prepareFiles();
      if (!navigator.share || !navigator.canShare?.({ files })) {
        patchState({ open: true, stage: "choose", busy: false, openWhatsApp: true, message: "", error: "Direct file sharing is unavailable in this browser. Use one of the assisted WhatsApp options below." });
        return;
      }
      // Record before handing control to the native share sheet. Installed Android
      // apps can be suspended while WhatsApp is foregrounded, so waiting for the
      // share promise to resolve can lose the audit request entirely.
      await recordShare("native");
      // Share the selected image files only. WhatsApp decides how
      // multiple attachments are grouped; posting copy is intentionally not
      // included in this share payload.
      await navigator.share({ files });
      patchState({ open: false, busy: false, message: "Photos shared successfully.", error: "" });
    } catch (error) {
      patchState({ busy: false, message: "", error: nativeShareErrorMessage(error) });
    }
  };

  const begin = async () => {
    if (sharingLayout) {
      patchState({ open: true, stage: "choose", busy: mobile, message: "", error: "" });
      if (mobile) {
        try {
          await prepareFiles();
          patchState({ busy: false, message: "" });
        } catch {
          patchState({ busy: false, message: "", error: "Unable to prepare this layout." });
        }
      }
      return;
    }
    if (!selectedPhotos.length) {
      patchState({ message: "", error: "Select at least one photo first." });
      return;
    }
    if (mobile) await shareNative();
    else patchState({ open: true, stage: "options", busy: false, message: "", error: "" });
  };

  const shareLayoutNative = async () => {
    if (!layoutFile) return;
    try {
      patchState({ busy: true, error: "" });
      // Invoke directly from the button press; preparation and audit must
      // not delay the Web Share call and consume its user activation.
      const sharing = navigator.share({ files: [layoutFile] });
      void recordShare("native");
      await sharing;
      patchState({ open: false, busy: false, message: "", error: "" });
    } catch (error) {
      patchState({ busy: false, error: error?.name === "AbortError" ? "" : "Direct sharing is unavailable. Download the JPG and attach it in WhatsApp." });
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
      const url = desktopWhatsAppUrl(client, "");
      if (popup) popup.location.href = url;
      else window.location.href = url;
      patchState({ busy: false, message: sharingLayout ? "Layout JPG downloaded. Attach it in WhatsApp after it opens." : "JPG photos downloaded. Attach them separately in WhatsApp after it opens.", error: "" });
    } catch {
      popup?.close();
      patchState({ busy: false, message: "", error: sharingLayout ? "Unable to prepare this layout for sharing." : "Unable to prepare these photos for sharing." });
    }
  };

  const whatsappCheckbox = <><label className="photo-share-checkbox"><input type="checkbox" checked={state.openWhatsApp} onChange={(event) => patchState({ openWhatsApp: event.target.checked })} /><span>{tSite("Open WhatsApp after downloading")}</span></label>{tSite(state.openWhatsApp ? <p className="photo-share-remark">{tSite("Reminder: WhatsApp cannot attach these files automatically on desktop. Please attach the downloaded JPG photos separately in the WhatsApp conversation.")}</p> : null)}</>;

  let modalContent;
  if (sharingLayout) {
    const canShareLayout = mobile && layoutFile && navigator.share && navigator.canShare?.({ files: [layoutFile] });
    modalContent = <div className="photo-share-client-choice">
      <span className="eyebrow">{tSite("Floor plan")}</span><h2>{tSite("Share layout")}</h2>
      <p>{tSite(canShareLayout ? "Choose WhatsApp in your share menu to attach the watermarked JPG." : "Download the watermarked JPG and attach it in WhatsApp.")}</p>
      {tSite(canShareLayout ? <button className="button primary" type="button" onClick={shareLayoutNative} disabled={state.busy}><MessageCircle size={18} />{tSite(" Open share menu")}</button> : null)}
      <button className="button secondary" type="button" onClick={downloadSelected} disabled={state.busy}><Download size={18} />{tSite(" Download layout JPG")}</button>
      {tSite(!mobile ? <>
        <button className="button primary" type="button" onClick={() => openDesktopClient("app")} disabled={state.busy}><Smartphone size={18} />{tSite(" WhatsApp App")}</button>
        <button className="button secondary" type="button" onClick={() => openDesktopClient("web")} disabled={state.busy}><Monitor size={18} />{tSite(" WhatsApp Web")}</button>
      </> : null)}
      {tSite(state.busy && state.message ? <p className="photo-share-progress" role="status"><LoaderCircle className="spin" size={16} /> {tSite(state.message)}</p> : null)}
      {tSite(state.error ? <p className="form-error" role="alert">{tSite(state.error)}</p> : null)}
      {tSite(state.message && !state.busy ? <p className="photo-share-success" role="status"><Check size={16} /> {tSite(state.message)}</p> : null)}
    </div>;
  } else if (state.stage === "options") {
    modalContent = <div className="photo-share-client-choice"><span className="eyebrow">{tSite("Selected photos")}</span><h2>{tSite("Download JPGs")}</h2><p>{tSite("Download your selected watermarked JPG photos. No personal details required.")}</p>{tSite(whatsappCheckbox)}<button className="button primary" type="button" onClick={continueDesktopOptions} disabled={state.busy}><Download size={18} /> {tSite(state.openWhatsApp ? "Continue" : "Download selected photos")}</button>{tSite(state.busy ? <p className="photo-share-progress"><LoaderCircle className="spin" size={16} /> {tSite(state.message)}</p> : null)}{tSite(state.error ? <p className="form-error" role="alert">{tSite(state.error)}</p> : null)}</div>;
  } else {
    modalContent = <div className="photo-share-client-choice"><span className="eyebrow">{tSite("Selected photos")}</span><h2>{tSite("Choose WhatsApp")}</h2><p>{tSite("The JPG files will download first. Please attach those downloaded photos separately after WhatsApp opens.")}</p><button className="button primary" type="button" onClick={() => openDesktopClient("app")} disabled={state.busy}><Smartphone size={18} />{tSite(" WhatsApp App")}</button><button className="button secondary" type="button" onClick={() => openDesktopClient("web")} disabled={state.busy}><Monitor size={18} />{tSite(" WhatsApp Web")}</button>{tSite(state.busy ? <p className="photo-share-progress"><LoaderCircle className="spin" size={16} /> {tSite(state.message)}</p> : null)}{tSite(state.error ? <p className="form-error" role="alert">{tSite(state.error)}</p> : null)}{tSite(state.message && !state.busy ? <p className="photo-share-success"><Check size={16} /> {tSite(state.message)}</p> : null)}</div>;
  }

  const modal = state.open ? <div className="photo-request-backdrop" role="dialog" aria-modal="true" aria-label={tSite(sharingLayout ? "Share property layout" : "Selected property photos")} onMouseDown={(event) => { if (event.target === event.currentTarget && !state.busy) close(); }}><div className="photo-request-modal"><button className="modal-close" type="button" onClick={close} aria-label={tSite("Close")} disabled={state.busy}><X size={20} /></button>{tSite(modalContent)}</div></div> : null;

  const hasSelection = selectedPhotos.length > 0;

  return <div className="selected-photo-share">
    {tSite(!sharingLayout ? <span className="photo-selection-limit">{tSite("Select up to ")}{tSite(PHOTO_SELECTION_LIMIT)}{tSite(" photos at a time.")}</span> : null)}
    {tSite(state.error && !state.open ? <span className="form-error" role="alert">{tSite(state.error)}</span> : null)}
    {tSite(state.message && !state.open && !state.busy ? <span role="status"><Check size={14} /> {tSite(state.message)}</span> : null)}
    <button className={`button photo-share-trigger ${sharingLayout || hasSelection ? "primary is-ready" : "secondary"}`} type="button" onClick={begin} disabled={state.busy}>{tSite(mobile || sharingLayout ? <MessageCircle className="photo-share-trigger-icon" size={17} /> : <Download className="photo-share-trigger-icon" size={17} />)} {tSite(state.busy && !state.open ? state.message : sharingLayout ? "Share layout to WhatsApp" : mobile ? "Share selected photos to WhatsApp" : "Download selected photos")}</button>
    {tSite(typeof document !== "undefined" ? createPortal(modal, document.body) : null)}
  </div>;
}
