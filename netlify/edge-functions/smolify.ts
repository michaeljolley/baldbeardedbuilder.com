import type { Config } from 'https://edge.netlify.com/';
import { v4 as uuidV4 } from 'https://deno.land/std@0.82.0/uuid/mod.ts';
import { getShortUrl, insertAnalytic } from './scripts/supabase.ts';

export default async function handler(req: Request) {
  // Search for the placeholder
  const url = new URL(req.url);
  const slug = url.searchParams.get('path');

  if (slug) {
    try {
      const target = await getShortUrl(slug);

      // record visit to short url
      await insertAnalytic({
        host: url.host,
        timezone: '',
        path: slug,
        xy: '',
        session: uuidV4.generate(),
      });

      if (target) {
        return Response.redirect(target, 301);
      } else {
        return Response.redirect('http://baldbeardedbuilder.com/404/', 404);
      }
    } catch (e) {
      console.error(e);
    }
  }

  return Response.redirect('http://baldbeardedbuilder.com/', 301);
}

export const config: Config = {
  path: '/api/smolify',
};
