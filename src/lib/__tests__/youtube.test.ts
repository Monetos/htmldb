import { describe, expect, it } from 'vitest';
import { youtubeEmbedUrl } from '../youtube';

describe('youtubeEmbedUrl', () => {
  it('parses a standard watch URL', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
  });

  it('parses a watch URL with extra query params', () => {
    expect(youtubeEmbedUrl('https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
  });

  it('parses a youtu.be short link', () => {
    expect(youtubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
  });

  it('parses a /shorts/ URL', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
  });

  it('parses an /embed/ URL', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
  });

  it('parses an already-nocookie embed URL', () => {
    expect(youtubeEmbedUrl('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
  });

  it('returns null for a non-YouTube URL', () => {
    expect(youtubeEmbedUrl('https://example.com/video')).toBeNull();
  });

  it('returns null for an invalid URL string', () => {
    expect(youtubeEmbedUrl('not a url')).toBeNull();
  });

  it('returns null for a YouTube URL with no resolvable video id', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/channel/UC123')).toBeNull();
  });
});
