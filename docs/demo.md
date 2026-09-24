# Synthetic Demo

The public edition never requires original company data.

Run:

```bash
npm run seed
```

The seed resets demo/runtime domain data and creates:

- synthetic cafe products and inventory
- three generic pickup locations
- three generic companies/locations
- employee, barista, admin, restaurant-manager and delegate demo accounts
- meal entitlement rules
- synthetic dishes and a current-week menu for each location
- a sample manager-to-delegate relationship

All demo accounts use `DemoPass!2026` and are documented only for local demonstration.

No network request is made by the seed. It does not download images or contact image APIs.

## Private legacy database for local-only verification

If you need to compare the generalized application against an older private SQLite dataset, keep a **copy** of that database outside this repository and point `DB_PATH` to the external file in `Backend/.env`, for example:

```env
DB_PATH=D:/AA-Work/private-data/cafe-local-copy.sqlite
```

Do not copy a private database into the repository tree and never use it for public screenshots, commits, release ZIPs, or GitHub Actions. The public demo database should remain synthetic.

Legacy Active Directory users are intentionally not guaranteed to authenticate in `AUTH_MODE=local`; the public edition no longer accepts or preserves historical AD password material. Product and operational records can still be inspected when the legacy schema is compatible.

## Typography

The public UI prefers a locally installed `IRANSansX`, `IRANSans`, or `IRANSansWeb` font when available. Proprietary font binaries are deliberately not bundled in this repository. If IRANSans is not installed locally, the UI falls back to a redistributable system font stack.
