# Security Notes

## Public-edition hardening

The publication pass removed organization-specific secrets/configuration and hardened the highest-risk application boundaries.

### Authentication

- JWT secrets have no source fallback.
- Delivery-lock HMAC secrets have no source fallback.
- Production rejects demo/placeholder secret values.
- LDAP credentials are environment-only.
- Raw LDAP user passwords are never stored in SQLite.
- LDAP profile synchronization keeps only a small allowed attribute set.

### Orders

- Order routes require authentication.
- The authenticated session determines the order owner.
- Canonical product price/name/state comes from SQLite.
- Totals are calculated server-side.
- Order reads allow only the owner or operational admin/barista roles.
- Idempotency lookup applies the same ownership rule.

### Uploads

The upload endpoint is restricted to admin/barista roles, accepts one file up to 5 MB, validates JPEG/PNG/WebP by magic bytes, and generates a UUID filename and trusted extension. Uploaded files are runtime data and are gitignored.

### Reporting SQL

Reporting allows one `SELECT` or `WITH ... SELECT` statement. The policy rejects mutation, schema, attachment, pragma, vacuum and transaction keywords after stripping comments and quoted values for policy analysis.

This is a bounded application policy, not a general-purpose SQL sandbox. Deployment environments with stronger isolation requirements should additionally execute analytics on a dedicated read-only database connection/user.

### LLM privacy

The reporting assistant receives table/column metadata only. It does not sample database rows. The `users.password` and `users.adAttributes` columns are excluded from the LLM schema description.

### Optional services

Firebase, LDAP and LLM services are disabled by default. Enabling a service without its required configuration fails clearly instead of silently falling back to insecure values.

## Dependency security baseline

- The frontend pins Next.js to `16.3.6`, the Active LTS security release published on 2026-09-22.
- Spreadsheet export uses the current SheetJS CE 0.20.3 package from the official SheetJS CDN rather than the stale `xlsx@0.18.5` npm release. The application only generates workbooks from application-owned report data and does not parse uploaded workbooks.
- LDAP/Active Directory support is optional and disabled by default. Review the LDAP adapter and dependency posture before enabling it in an internet-facing production deployment.

## Deployment notes

Before any non-local deployment:

1. Generate unique high-entropy JWT and delivery-lock secrets.
2. Configure exact CORS origins.
3. Use HTTPS so the authentication cookie is `Secure`.
4. Keep Firebase service-account files outside the repository.
5. Review the selected LLM provider's data-processing terms before enabling it.
6. Replace local file uploads with managed storage if multi-instance deployment is required.
