import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Smart Fasal Farmer',
    short_name: 'Smart Fasal',
    description: 'Mobile-first farmer service for the Smart Fasal Raigad pilot.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F9F5',
    theme_color: '#166534',
    lang: 'mr',
  };
}
