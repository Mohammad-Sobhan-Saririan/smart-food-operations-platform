const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');

/**
 * Resolves media paths stored by both the legacy organizational build and the
 * generalized public build.
 *
 * Supported inputs:
 * - api/images/Foo.jpg   (legacy DB)
 * - /api/images/Foo.jpg  (legacy DB)
 * - images/Foo.jpg
 * - /images/Foo.jpg      (public build)
 * - https://...           (already absolute)
 * - blob:/data: URLs      (local previews)
 */
export function resolveMediaUrl(value?: string | null): string {
  const raw = value?.trim();
  if (!raw) return '';

  if (/^(?:blob:|data:)/i.test(raw)) return raw;

  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).toString();
    } catch {
      return '';
    }
  }

  let path = raw.replace(/\\/g, '/');

  // Backward compatibility for older DB rows that stored api/images/...
  path = path.replace(/^\/?api\/images\//i, '/images/');

  if (!path.startsWith('/')) path = `/${path}`;

  // Backend-owned media should resolve against the configured API origin.
  if (path.startsWith('/images/') && API_BASE_URL) {
    try {
      return new URL(path, `${API_BASE_URL}/`).toString();
    } catch {
      return '';
    }
  }

  // Other root-relative paths are frontend assets.
  return path;
}
