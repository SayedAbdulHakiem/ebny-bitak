import { t } from '../../locale/locale';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

export function youtubeVideoId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  if (host.endsWith('youtu.be')) {
    return videoId(url.pathname.split('/').filter(Boolean)[0] ?? '');
  }

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] === 'watch') return videoId(url.searchParams.get('v') ?? '');
  if ((parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live' || parts[0] === 'v') && parts[1]) {
    return videoId(parts[1]);
  }
  return null;
}

export function normalizeYoutubeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const id = youtubeVideoId(trimmed);
  if (!id) throw new Error(t().errors.youtubeInvalid);
  return `https://www.youtube.com/watch?v=${id}`;
}

function videoId(value: string): string | null {
  return /^[\w-]{11}$/.test(value) ? value : null;
}
