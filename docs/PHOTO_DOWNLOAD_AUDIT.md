# Per-SMI photo downloads and audit

The public ZIP-download workflow has been retired. Each published WTS/WTL property detail page now exposes the selected-photo workflow. Visitors register once, choose photos, and either download watermarked JPGs or open WhatsApp. Each completed action is recorded with the visitor identity, SMI code, photo count, method and timestamp.

The private audit page is `/admin/photo-downloads`. It now reads `photo_share_events` from the private D1 database and reports `download`, `native`, `app` and `web` actions. Legacy ZIP routes and storage may remain dormant for migration compatibility, but are no longer rendered by the public property page.

The owner-only audit page is `/admin/photo-downloads`. It requires the configured administrator Access identity and is not linked from public navigation. It reads the private `REQUIREMENTS_DB` tables created by `migrations/0004_photo_share_tracking.sql` and the visitor table from the earlier migration.

Required production setup:

- Apply the migration to the D1 database bound as `REQUIREMENTS_DB`.
- Upload the generated `artifacts/photo-packages/*.zip` files to private R2 using the package manifest.
- Ensure `CURRENT_INVENTORY_VERSION` matches the uploaded package metadata.
- Keep R2 public access disabled; downloads are streamed only through the authenticated session endpoint.
