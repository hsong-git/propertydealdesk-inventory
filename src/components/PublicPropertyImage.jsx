export function PublicPropertyImage({ alt, ...props }) {
  return <img
    {...props}
    alt={alt}
    draggable="false"
    onContextMenu={(event) => event.preventDefault()}
    onDragStart={(event) => event.preventDefault()}
  />;
}
