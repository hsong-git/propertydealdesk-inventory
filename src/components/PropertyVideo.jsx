import { useSiteLanguage } from "./InquiryLanguage";
import { useState } from "react";

export function PropertyVideo({ src, title, poster }) {
  const { t: tSite } = useSiteLanguage();
  const [failedSource, setFailedSource] = useState(null);
  const playbackSrc = src.replace(/^\/inventory\//, "/api/videos/");
  return failedSource === src ? <p className="property-video-error">{tSite("This video could not be played. ")}<a href={playbackSrc} target="_blank" rel="noreferrer">{tSite("Open video")}</a></p> :
    <video key={src} className="property-video" src={playbackSrc} poster={poster} controls playsInline preload="none"
      aria-label={tSite(`${title} property video`)} onError={() => setFailedSource(src)}>{tSite("Your browser does not support video playback. ")}<a href={playbackSrc}>{tSite("Open video")}</a>
    </video>;
}
