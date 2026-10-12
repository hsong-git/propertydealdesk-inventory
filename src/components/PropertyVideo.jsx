import { useState } from "react";

export function PropertyVideo({ src, title, poster }) {
  const [failedSource, setFailedSource] = useState(null);
  const playbackSrc = src.replace(/^\/inventory\//, "/api/videos/");
  return failedSource === src ? <p className="property-video-error">This video could not be played. <a href={playbackSrc} target="_blank" rel="noreferrer">Open video</a></p> :
    <video key={src} className="property-video" src={playbackSrc} poster={poster} controls playsInline preload="none"
      aria-label={`${title} property video`} onError={() => setFailedSource(src)}>
      Your browser does not support video playback. <a href={playbackSrc}>Open video</a>
    </video>;
}
