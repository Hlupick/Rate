import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'monah — музыка, которая всегда рядом',
    short_name: 'monah',
    description: 'Слушайте музыку, собирайте плейлисты и загружайте треки — всё в одном месте.',
    lang: 'ru',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait-primary',
    background_color: '#101010',
    theme_color: '#101010',
    categories: ['music', 'entertainment'],
    prefer_related_applications: false,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Поиск',
        short_name: 'Поиск',
        description: 'Найти трек, исполнителя или плейлист',
        url: '/search',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Моя медиатека',
        short_name: 'Медиатека',
        description: 'Любимые треки и плейлисты',
        url: '/library',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Загрузить трек',
        short_name: 'Загрузить',
        description: 'Добавить музыку в каталог',
        url: '/upload',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  }
}
