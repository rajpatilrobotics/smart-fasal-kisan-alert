export const workboxStaticPolicy = Object.freeze({
  globDirectory: '.',
  globPatterns: Object.freeze([
    '.next/static/**/*.{js,css,woff,woff2,png,jpg,jpeg,webp,svg,ico,avif}',
    'public/offline.html',
  ]),
  globIgnores: Object.freeze(['**/*.map', 'public/sw.js', 'public/workbox-*/**']),
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  modifyURLPrefix: Object.freeze({ '.next/': '_next/', 'public/': '' }),
});
