import type { AppLocale, MediaVideo } from '../shared/types.ts';
import { sanitizeDownloadFilename } from '../server/mediaParser.ts';

export function isTikTokMedia(video: Pick<MediaVideo, 'id' | 'sourceType'>): boolean {
  return video.sourceType === 'tiktok' || video.id.startsWith('tt_');
}

export function getRawMediaId(video: Pick<MediaVideo, 'id' | 'sourceType'>): string {
  if (isTikTokMedia(video) && video.id.startsWith('tt_')) {
    return video.id.slice(3);
  }
  return video.id;
}

export function buildDirectDownloadUrl(
  video: Pick<MediaVideo, 'id' | 'sourceType'>,
  origin: string,
): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const rawId = encodeURIComponent(getRawMediaId(video));
  if (isTikTokMedia(video)) {
    return `${cleanOrigin}/api/tiktok/stream/${rawId}?download=1`;
  }
  return `${cleanOrigin}/api/videos/item/${rawId}/download.mp4`;
}

export function buildVideoSharePayload(
  video: Pick<MediaVideo, 'id' | 'title' | 'sourceType'>,
  origin: string,
  locale: AppLocale,
): {
  title: string;
  text: string;
  url: string;
  filename: string;
} {
  const url = buildDirectDownloadUrl(video, origin);
  const filename = sanitizeDownloadFilename(video.title, getRawMediaId(video));
  const text =
    locale === 'ar'
      ? `${video.title}\nرابط تحميل الفيديو المباشر (MP4):`
      : `${video.title}\nDirect MP4 video download link:`;

  return {
    title: video.title,
    text,
    url,
    filename,
  };
}

export function formatBytesLabel(bytes: number | undefined, locale: AppLocale): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) {
    return '';
  }
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    const gb = (mb / 1024).toFixed(2);
    return locale === 'ar' ? `${gb} جيجابايت` : `${gb} GB`;
  }
  if (mb >= 1) {
    const val = mb >= 100 ? mb.toFixed(0) : mb.toFixed(1);
    return locale === 'ar' ? `${val} ميجابايت` : `${val} MB`;
  }
  const kb = Math.max(1, Math.round(bytes / 1024));
  return locale === 'ar' ? `${kb} كيلوبايت` : `${kb} KB`;
}
