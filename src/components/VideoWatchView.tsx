import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BellRing,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Play,
  ThumbsUp,
} from 'lucide-react';
import type {
  AppLocale,
  MediaComment,
  MediaVideo,
  VideoDetailsResponse,
} from '../shared/types.ts';
import { getCopy } from '../utils/i18n.ts';
import { DramaVideoPlayer } from './DramaVideoPlayer.tsx';

interface VideoWatchViewProps {
  locale: AppLocale;
  details: VideoDetailsResponse | null;
  loading: boolean;
  error: string | null;
  fallbackVideo: MediaVideo | null;
  savedIds: Set<string>;
  subscribedIds: Set<string>;
  onBack: () => void;
  onSelectVideo: (video: MediaVideo) => void;
  onToggleSave: (video: MediaVideo) => void;
  onToggleSubscribe: (channel: {
    id: string;
    name: string;
    avatar?: string;
    subscribersText?: string;
  }) => void;
  onOpenChannel: (channelId: string) => void;
}

export function VideoWatchView({
  locale,
  details,
  loading,
  error,
  fallbackVideo,
  savedIds,
  subscribedIds,
  onBack,
  onSelectVideo,
  onToggleSave,
  onToggleSubscribe,
  onOpenChannel,
}: VideoWatchViewProps) {
  const t = getCopy(locale);
  const [descExpanded, setDescExpanded] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  // Comments are collapsed until the user taps on the Comments card
  const [commentsOpen, setCommentsOpen] = useState(false);

  const activeVideo = details?.video || fallbackVideo;
  const BackArrow = locale === 'ar' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    setCommentsOpen(false);
    setDescExpanded(false);
  }, [activeVideo?.id]);

  if (error && !activeVideo) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-center sm:p-8 dark:border-red-900/50 dark:bg-slate-900">
        <p className="text-base font-semibold text-red-600 dark:text-red-400">{t.errorTitle}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{error}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t.backToList}
          </button>
        </div>
      </div>
    );
  }

  if (!activeVideo) {
    return null;
  }

  const isSaved = savedIds.has(activeVideo.id);
  const channelKey = activeVideo.channelId || activeVideo.channelName;
  const isSubscribed = subscribedIds.has(channelKey);

  const allComments: MediaComment[] = details?.comments || [];

  const playerNode = (
    <DramaVideoPlayer
      videoId={activeVideo.id}
      streamUrl={activeVideo.streamUrl}
      title={activeVideo.title}
      thumbnail={activeVideo.thumbnail}
      locale={locale}
      theaterMode={theaterMode}
      onToggleTheater={() => setTheaterMode((v) => !v)}
      onBack={onBack}
    />
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <BackArrow className="h-4 w-4" />
          <span>{t.backToList}</span>
        </button>
      </div>

      {theaterMode && <div className="w-full space-y-3">{playerNode}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Main Player + Details + Tap-to-Expand Comments Column */}
        <div className="min-w-0 space-y-4 sm:space-y-5 xl:col-span-8">
          {!theaterMode && playerNode}

          {/* Video Details Card */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
            <h1 className="text-balance text-lg font-bold leading-snug text-slate-900 sm:text-xl lg:text-2xl dark:text-white">
              {activeVideo.title}
            </h1>

            <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              {/* Channel + Subscribe */}
              <div className="flex flex-wrap items-center gap-3">
                {activeVideo.channelAvatar ? (
                  <img
                    src={activeVideo.channelAvatar}
                    alt={activeVideo.channelName}
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 shrink-0 rounded-full object-cover bg-slate-200 dark:bg-slate-800"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
                    {activeVideo.channelName.slice(0, 1).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  {activeVideo.channelId ? (
                    <button
                      type="button"
                      onClick={() => onOpenChannel(activeVideo.channelId)}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:text-red-600 dark:text-white dark:hover:text-red-400"
                    >
                      <span className="truncate max-w-[170px] sm:max-w-xs">{activeVideo.channelName}</span>
                      {activeVideo.channelVerified && (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      )}
                    </button>
                  ) : (
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {activeVideo.channelName}
                    </p>
                  )}

                  {details?.video?.subscribersText && (
                    <p className="tabular-nums text-xs text-slate-500 dark:text-slate-400">
                      {details.video.subscribersText}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onToggleSubscribe({
                      id: channelKey,
                      name: activeVideo.channelName,
                      avatar: activeVideo.channelAvatar,
                      subscribersText: details?.video?.subscribersText,
                    })
                  }
                  className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-red-600 ${
                    isSubscribed
                      ? 'border border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {isSubscribed ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                  <span>{isSubscribed ? t.subscribed : t.subscribe}</span>
                </button>
              </div>

              {/* Video Actions: Likes + Save */}
              <div className="flex flex-wrap items-center gap-2">
                {details?.video?.likesText && (
                  <span className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 tabular-nums dark:border-slate-700 dark:text-slate-200">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span>{details.video.likesText}</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => onToggleSave(activeVideo)}
                  className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold transition-colors ${
                    isSaved
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                  <span>{isSaved ? t.savedVideo : t.saveVideo}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              {activeVideo.viewsText && (
                <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">
                  {activeVideo.viewsText}
                </span>
              )}
              {activeVideo.viewsText && (details?.video?.uploadDateText || activeVideo.publishedText) && (
                <span aria-hidden="true">·</span>
              )}
              <span>{details?.video?.uploadDateText || activeVideo.publishedText}</span>
            </div>

            {loading ? (
              <div className="space-y-2 pt-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ) : (
              details?.video?.description && (
                <div className="rounded-xl bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-700 sm:p-4 dark:bg-slate-950/60 dark:text-slate-300">
                  <p className={`whitespace-pre-line break-words ${descExpanded ? '' : 'line-clamp-3'}`}>
                    {details.video.description}
                  </p>
                  {details.video.description.length > 160 && (
                    <button
                      type="button"
                      onClick={() => setDescExpanded((v) => !v)}
                      className="mt-2 text-xs font-semibold text-red-600 hover:underline dark:text-red-400"
                    >
                      {descExpanded ? t.showLess : t.showMore}
                    </button>
                  )}
                </div>
              )
            )}
          </div>

          {/* Read-only Comments Card: Collapsed by default; clicking reveals all comments */}
          <section
            aria-label={t.commentsHeading}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => setCommentsOpen((v) => !v)}
              aria-expanded={commentsOpen}
              data-testid="comments-toggle-button"
              className="flex w-full items-center justify-between gap-3 p-3.5 text-start transition-colors hover:bg-slate-50 sm:p-4 dark:hover:bg-slate-800/60"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-bold text-slate-900 sm:text-base dark:text-white">
                    {t.commentsHeading}
                  </span>
                  {!loading && (
                    <span className="tabular-nums text-xs font-semibold text-slate-500 dark:text-slate-400">
                      ({allComments.length})
                    </span>
                  )}
                </div>

                {!commentsOpen && (
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {loading
                      ? t.loadingMore
                      : allComments[0]
                        ? `${allComments[0].authorName}: ${allComments[0].text}`
                        : t.commentsTogglePrompt}
                  </p>
                )}
              </div>

              <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <span className="hidden sm:inline">
                  {commentsOpen ? t.commentsHidePrompt : t.commentsTogglePrompt}
                </span>
                {commentsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>

            {commentsOpen && (
              <div
                data-testid="comments-list-panel"
                className="space-y-4 border-t border-slate-100 p-3.5 sm:p-5 dark:border-slate-800"
              >
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                          <div className="h-3.5 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : allComments.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    {t.commentsEmpty}
                  </p>
                ) : (
                  <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
                    {allComments.map((comment) => (
                      <article key={comment.id} className="flex gap-3 pt-4 first:pt-0">
                        {comment.authorAvatar ? (
                          <img
                            src={comment.authorAvatar}
                            alt={comment.authorName}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-9 w-9 shrink-0 rounded-full object-cover bg-slate-200 dark:bg-slate-800"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white dark:bg-slate-700">
                            {comment.authorName.replace(/^@/, '').slice(0, 1).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {comment.authorName}
                            </span>
                            {comment.isCreator && (
                              <span className="font-semibold text-red-600 dark:text-red-400">
                                · {t.creatorBadge}
                              </span>
                            )}
                            {comment.publishedText && (
                              <>
                                <span aria-hidden="true" className="text-slate-400">·</span>
                                <span className="text-slate-500 dark:text-slate-400">
                                  {comment.publishedText}
                                </span>
                              </>
                            )}
                          </div>

                          <p className="whitespace-pre-line break-words text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                            {comment.text}
                          </p>

                          <div className="flex items-center gap-3 pt-0.5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              <span>{comment.likesText || '0'}</span>
                            </span>
                            {comment.replyCountText && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>
                                  {comment.replyCountText} {locale === 'ar' ? 'ردود' : 'replies'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Related Videos Column */}
        <aside className="min-w-0 space-y-3 xl:col-span-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{t.relatedVideos}</h2>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="h-20 w-32 shrink-0 animate-pulse rounded-lg bg-slate-200 sm:w-36 dark:bg-slate-800" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3.5 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {(details?.related || []).map((rel) => (
                <div
                  key={rel.id}
                  className="flex items-stretch gap-2 rounded-xl border border-slate-200 bg-white p-2 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                >
                  <button
                    type="button"
                    onClick={() => onSelectVideo(rel)}
                    className="group flex min-w-0 flex-1 gap-3 text-start focus-visible:outline-2 focus-visible:outline-red-600"
                  >
                    <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-900 sm:w-36">
                      {rel.thumbnail ? (
                        <img
                          src={rel.thumbnail}
                          alt={rel.title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Play className="h-5 w-5 text-red-500" />
                        </div>
                      )}
                      <span className="tabular-nums absolute bottom-1 end-1 rounded bg-slate-950/85 px-1 py-0.5 text-[11px] font-medium text-white">
                        {rel.isLive ? t.liveLabel : rel.duration}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="line-clamp-2 text-xs font-semibold leading-snug text-slate-900 group-hover:text-red-600 dark:text-slate-100 dark:group-hover:text-red-400">
                        {rel.title}
                      </p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {rel.channelName}
                      </p>
                      {(rel.viewsText || rel.publishedText) && (
                        <p className="truncate tabular-nums text-[11px] text-slate-400 dark:text-slate-500">
                          {[rel.viewsText, rel.publishedText].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
