/**
 * @fileoverview Next.js robots.txt route excluding internal API endpoints from indexing.
 */

import type { MetadataRoute } from 'next';

/**
 * Generates crawler directives permitting public pages and disallowing `/api/`.
 *
 * @returns Next.js `MetadataRoute.Robots` directive object.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
  };
}
