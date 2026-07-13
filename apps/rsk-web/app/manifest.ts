import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Smart Fasal RSK Operations',
    short_name: 'Smart Fasal RSK',
    description: 'Purpose-bound Rythu Seva Kendram operations workspace for the Raigad pilot.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F4F7F5',
    theme_color: '#124E3B',
    lang: 'en',
  };
}
