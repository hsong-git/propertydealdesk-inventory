# Per-SMI photo downloads and audit

Each published WTS/WTL property detail page exposes a **Download photos** action. The first successful attempt asks for the visitor's name and email and stores a long-lived, HttpOnly session cookie. Later downloads reuse that session without asking again.

The download endpoint accepts only a specific SMI code, streams that SMI's private R2 ZIP, and records a successful download event with the visitor, listing code, timestamp and user-agent. ZIP images are generated as WebP display copies with the approved embedded watermark (`TRR HS Ong` / `property.myeviv.com`); originals are never packaged.

The owner-only audit page is `/admin/photo-downloads`. It requires the configured administrator Access identity and is not linked from public navigation. It reads the private `REQUIREMENTS_DB` tables created by `migrations/0002_photo_download_tracking.sql`.

Required production setup:

- Apply the migration to the D1 database bound as `REQUIREMENTS_DB`.
- Upload the generated `artifacts/photo-packages/*.zip` files to private R2 using the package manifest.
- Ensure `CURRENT_INVENTORY_VERSION` matches the uploaded package metadata.
- Keep R2 public access disabled; downloads are streamed only through the authenticated session endpoint.
