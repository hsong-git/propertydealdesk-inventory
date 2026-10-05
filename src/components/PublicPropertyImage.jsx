import { propertyPhotoWatermark, shouldRenderBrowserWatermark } from "../config/watermark";
import { galleryPhotoUrl } from "../utils/galleryPhoto";

export function PublicPropertyImage({ alt, className = "", allowIndividualSave = false, src, ...props }) {
  const showWatermark = !allowIndividualSave && shouldRenderBrowserWatermark(propertyPhotoWatermark);
  return (
    <span
      className={`watermarked-image ${showWatermark ? "has-browser-watermark" : "no-browser-watermark"} ${className}`.trim()}
      data-watermark-mode={allowIndividualSave ? "embedded" : propertyPhotoWatermark.mode}
      style={{
        "--watermark-opacity": propertyPhotoWatermark.opacity,
      }}
    >
      <img
        {...props}
        src={allowIndividualSave ? galleryPhotoUrl(src) : src}
        alt={alt}
        draggable="false"
        onContextMenu={allowIndividualSave ? undefined : (event) => event.preventDefault()}
        onDragStart={(event) => event.preventDefault()}
      />
      {showWatermark ? (
        <span className="watermark-overlay" aria-hidden="true">
          <img className="watermark-logo" src={propertyPhotoWatermark.logo} alt="" draggable="false" />
        </span>
      ) : null}
    </span>
  );
}
