import type {
  AppLocale,
  ChannelResponse,
  DurationFilter,
  SearchResponse,
  SearchType,
  ServerHealthResponse,
  SortOrder,
  SuggestResponse,
  TikTokCategory,
  TikTokFeedResponse,
  TrendingCategory,
  TrendingResponse,
  VideoDetailsResponse,
} from '../shared/types.ts';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export function fetchServerHealth(): Promise<ServerHealthResponse> {
  return fetchJson<ServerHealthResponse>('/api/health');
}

export function fetchTrending(
  category: TrendingCategory,
  hl: AppLocale,
  refresh = false,
  seed?: number,
): Promise<TrendingResponse> {
  const qs = new URLSearchParams({ category, hl });
  if (refresh) qs.set('refresh', '1');
  if (typeof seed === 'number' && Number.isFinite(seed)) qs.set('seed', String(seed));
  return fetchJson<TrendingResponse>(`/api/videos/trending?${qs.toString()}`);
}

export function fetchTikTokFeed(
  category: TikTokCategory = 'all',
  refresh = false,
): Promise<TikTokFeedResponse> {
  return fetchJson<TikTokFeedResponse>(
    `/api/tiktok/feed?category=${encodeURIComponent(category)}${refresh ? '&refresh=1' : ''}`,
  );
}

export function fetchTikTokSearch(query: string): Promise<TikTokFeedResponse> {
  return fetchJson<TikTokFeedResponse>(
    `/api/tiktok/search?q=${encodeURIComponent(query.trim())}`,
  );
}

export function fetchSearch(params: {
  query: string;
  sort: SortOrder;
  type: SearchType;
  duration: DurationFilter;
  continuation?: string;
  hl: AppLocale;
}): Promise<SearchResponse> {
  const qs = new URLSearchParams({
    q: params.query,
    sort: params.sort,
    type: params.type,
    duration: params.duration,
    hl: params.hl,
  });
  if (params.continuation) {
    qs.set('continuation', params.continuation);
  }
  return fetchJson<SearchResponse>(`/api/videos/search?${qs.toString()}`);
}

export function fetchSuggestions(query: string, hl: AppLocale): Promise<SuggestResponse> {
  return fetchJson<SuggestResponse>(
    `/api/videos/suggest?q=${encodeURIComponent(query)}&hl=${encodeURIComponent(hl)}`,
  );
}

export function fetchVideoDetails(videoId: string, hl: AppLocale): Promise<VideoDetailsResponse> {
  return fetchJson<VideoDetailsResponse>(
    `/api/videos/item/${encodeURIComponent(videoId)}?hl=${encodeURIComponent(hl)}`,
  );
}

export function fetchChannelDetails(channelId: string, hl: AppLocale): Promise<ChannelResponse> {
  return fetchJson<ChannelResponse>(
    `/api/videos/channel/${encodeURIComponent(channelId)}?hl=${encodeURIComponent(hl)}`,
  );
}

export interface StreamResolvePayload {
  playable: boolean;
  kind?: 'mp4' | 'hls';
  url?: string;
  title?: string;
  code?: string;
  reason?: string;
}
