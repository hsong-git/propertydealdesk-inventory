import { useState } from "react";

export function PropertyVideo({ src, title, poster }) {
  const [failedSource, setFailedSource] = useState(null);
  return failedSource === src ? <p className="property-video-error">This video could not be played. <a href={src} target="_blank" rel="noreferrer">Open video</a></p> :
    <video key={src} className="property-video" src={src} poster={poster} controls playsInline preload="none"
      aria-label={`${title} property video`} onError={() => setFailedSource(src)}>
      Your browser does not support video playback. <a href={src}>Open video</a>
    </video>;
}
