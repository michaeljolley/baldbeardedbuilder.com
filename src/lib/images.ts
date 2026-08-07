const CLOUDINARY_UPLOAD = '/image/upload/';

/**
 * Returns a right-sized Cloudinary delivery URL while leaving every other image source
 * untouched. The content repository owns the original URL, so the site only adds delivery
 * transforms and never rewrites the asset itself.
 */
export function imageUrlAtWidth(source: string, width: number): string {
  let url: URL;

  try {
    url = new URL(source);
  } catch {
    return source;
  }

  if (url.hostname !== 'res.cloudinary.com') return source;

  const uploadAt = url.pathname.indexOf(CLOUDINARY_UPLOAD);
  if (uploadAt === -1) return source;

  const before = url.pathname.slice(0, uploadAt + CLOUDINARY_UPLOAD.length);
  const after = url.pathname.slice(uploadAt + CLOUDINARY_UPLOAD.length);
  url.pathname = `${before}c_limit,f_auto,q_auto,w_${width}/${after}`;
  return url.href;
}
