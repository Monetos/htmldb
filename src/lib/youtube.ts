/**
 * Parses a YouTube watch/short/embed URL into a privacy-friendly
 * youtube-nocookie.com embed URL, or null if the video id can't be found.
 */
export function youtubeEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, '');
  if (!['youtube.com', 'youtube-nocookie.com', 'youtu.be', 'm.youtube.com'].includes(host)) {
    return null;
  }

  let videoId: string | null = null;
  if (host === 'youtu.be') {
    videoId = parsed.pathname.slice(1).split('/')[0] || null;
  } else if (parsed.pathname === '/watch') {
    videoId = parsed.searchParams.get('v');
  } else if (parsed.pathname.startsWith('/shorts/')) {
    videoId = parsed.pathname.slice('/shorts/'.length).split('/')[0] || null;
  } else if (parsed.pathname.startsWith('/embed/')) {
    videoId = parsed.pathname.slice('/embed/'.length).split('/')[0] || null;
  }

  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}
