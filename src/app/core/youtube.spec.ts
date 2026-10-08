import { normalizeYoutubeUrl, youtubeVideoId } from './youtube';

describe('youtube url', () => {
  it('reads the video id from common YouTube links', () => {
    expect(youtubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeVideoId('')).toBeNull();
    expect(youtubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });

  it('stores one watch link and rejects other sites', () => {
    expect(normalizeYoutubeUrl(' https://youtu.be/dQw4w9WgXcQ ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(normalizeYoutubeUrl('  ')).toBe('');
    expect(() => normalizeYoutubeUrl('https://example.com/video')).toThrow();
  });
});