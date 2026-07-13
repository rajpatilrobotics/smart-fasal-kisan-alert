import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Smart Fasal MP Office Intelligence',
    short_name: 'Smart Fasal MP',
    description: 'Privacy-released constituency intelligence for the Smart Fasal Raigad pilot.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F7FA',
    theme_color: '#1E293B',
    lang: 'en',
  };
}
