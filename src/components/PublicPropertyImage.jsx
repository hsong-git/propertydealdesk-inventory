import { propertyPhotoWatermark, shouldRenderBrowserWatermark } from "../config/watermark";

export function PublicPropertyImage({ alt, className = "", ...props }) {
  const showWatermark = shouldRenderBrowserWatermark(propertyPhotoWatermark);
  return (
    <span
      className={`watermarked-image ${showWatermark ? "has-browser-watermark" : "no-browser-watermark"} ${className}`.trim()}
      data-watermark-mode={propertyPhotoWatermark.mode}
      style={{
        "--watermark-opacity": propertyPhotoWatermark.opacity,
      }}
    >
      <img
        {...props}
        alt={alt}
        draggable="false"
        onContextMenu={(event) => event.preventDefault()}
        onDragStart={(event) => event.preventDefault()}
      />
      {showWatermark ? (
        <span className="watermark-overlay" aria-hidden="true">
          <span className="watermark-title">{propertyPhotoWatermark.lines.title}</span>
          <span className="watermark-subtitle">{propertyPhotoWatermark.lines.subtitle}</span>
        </span>
      ) : null}
    </span>
  );
}
