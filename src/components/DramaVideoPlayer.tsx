import React, { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Maximize,
  Minimize,
  MoveHorizontal,
  Pause,
  Play,
  RectangleHorizontal,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { AppLocale } from '../shared/types.ts';
import { getCopy } from '../utils/i18n.ts';
import { formatVideoDuration } from '../server/mediaParser.ts';

export interface PlayerStreamErrorInfo {
  status?: number | null;
  message: string;
}

interface DramaVideoPlayerProps {
  videoId: string;
  streamUrl: string;
  title: string;
  thumbnail: string;
  locale: AppLocale;
  theaterMode: boolean;
  retrySignal?: number;
  onStreamError?: (info: PlayerStreamErrorInfo) => void;
  onStreamRecovered?: () => void;
  onToggleTheater: () => void;
  onBack?: () => void;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

export function DramaVideoPlayer({
  videoId,
  streamUrl,
  title,
  thumbnail,
  locale,
  theaterMode,
  retrySignal = 0,
  onStreamError,
  onStreamRecovered,
  onToggleTheater,
  onBack,
}: DramaVideoPlayerProps) {
  const t = getCopy(locale);
  const BackArrow = locale === 'ar' ? ArrowRight : ArrowLeft;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const onStreamErrorRef = useRef(onStreamError);
  const onStreamRecoveredRef = useRef(onStreamRecovered);
  onStreamErrorRef.current = onStreamError;
  onStreamRecoveredRef.current = onStreamRecovered;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [fillScreen, setFillScreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const fallbackHandlerRef = useRef<(() => boolean) | null>(null);

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const bumpControlsVisibility = useCallback(() => {
    setControlsVisible(true);
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      const vid = videoRef.current;
      if (vid && !vid.paused) {
        setControlsVisible(false);
      }
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Resolve and play strictly on the native custom app player (<video> / HLS)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    let cancelled = false;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setIsPlaying(false);
    setIsBuffering(true);
    setHasError(false);
    setErrorStatus(null);
    setErrorDetail(null);
    setCurrentTime(0);
    setDuration(0);
    setBufferedEnd(0);
    setControlsVisible(true);

    let fallbackAttempted = false;
    const isLocalBlob = streamUrl.startsWith('blob:');
    const isServerItem = streamUrl.startsWith('/api/videos/item/');

    const reportStreamFailure = (status: number | null, message: string) => {
      if (cancelled) return;
      setErrorStatus(status);
      setErrorDetail(message);
      setHasError(true);
      setIsBuffering(false);
      onStreamErrorRef.current?.({ status, message });
    };

    const attachPlaybackSource = (resolvedUrl: string, isHlsSource: boolean) => {
      if (cancelled) return;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const trySilentFallback = (status: number | null, message: string): boolean => {
        if (
          !fallbackAttempted &&
          videoId &&
          !isLocalBlob &&
          resolvedUrl.startsWith('http')
        ) {
          fallbackAttempted = true;
          const fallbackEndpoint = isHlsSource
            ? `/api/videos/item/${encodeURIComponent(videoId)}/stream.m3u8`
            : `/api/videos/item/${encodeURIComponent(videoId)}/media.mp4`;
          attachPlaybackSource(fallbackEndpoint, isHlsSource);
          return true;
        }
        reportStreamFailure(status, message);
        return false;
      };

      fallbackHandlerRef.current = () => {
        if (!fallbackAttempted && videoId && !isLocalBlob && resolvedUrl.startsWith('http')) {
          fallbackAttempted = true;
          const fallbackEndpoint = isHlsSource
            ? `/api/videos/item/${encodeURIComponent(videoId)}/stream.m3u8`
            : `/api/videos/item/${encodeURIComponent(videoId)}/media.mp4`;
          attachPlaybackSource(fallbackEndpoint, isHlsSource);
          return true;
        }
        return false;
      };

      if (isHlsSource && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsBuffering(false);
          onStreamRecoveredRef.current?.();
          video.playbackRate = playbackRate;
          video
            .play()
            .then(() => {
              setIsPlaying(true);
              bumpControlsVisibility();
            })
            .catch(() => {
              setIsPlaying(false);
            });
        });

        let networkRetries = 0;
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data.fatal) {
            const httpCode =
              typeof data.response?.code === 'number' && data.response.code > 0
                ? data.response.code
                : null;
            if (httpCode === 403 || httpCode === 404 || httpCode === 401 || httpCode === 0) {
              hls.destroy();
              trySilentFallback(httpCode, t.streamAccessErrorLabel);
              return;
            }
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRetries < 2) {
              networkRetries += 1;
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              hls.destroy();
              trySilentFallback(httpCode, t.streamAccessErrorLabel);
            }
          }
        });

        hls.loadSource(resolvedUrl);
        hls.attachMedia(video);
      } else {
        video.src = resolvedUrl;
        video.load();
        video
          .play()
          .then(() => {
            setIsPlaying(true);
            setIsBuffering(false);
            onStreamRecoveredRef.current?.();
            bumpControlsVisibility();
          })
          .catch(() => {
            setIsPlaying(false);
            setIsBuffering(false);
          });
      }
    };

    if (!isLocalBlob && isServerItem && videoId) {
      const qs = new URLSearchParams({ hl: locale });
      if (title.trim()) qs.set('title', title.trim());
      void fetch(`/api/videos/item/${encodeURIComponent(videoId)}/resolve?${qs.toString()}`)
        .then(async (res) => {
          if (!res.ok) {
            reportStreamFailure(res.status, t.streamAccessErrorLabel);
            return;
          }
          const data = (await res.json()) as {
            playable?: boolean;
            kind?: 'mp4' | 'hls';
            url?: string;
            code?: string;
            reason?: string;
          };
          if (cancelled) return;
          if (!data.playable || !data.url) {
            const inferredStatus = data.code === 'STREAM_UNAVAILABLE' ? 404 : null;
            reportStreamFailure(inferredStatus, data.reason || t.streamAccessErrorLabel);
            return;
          }
          attachPlaybackSource(data.url, data.kind === 'hls' || data.url.includes('.m3u8'));
        })
        .catch(() => {
          if (cancelled) return;
          reportStreamFailure(null, t.streamAccessErrorLabel);
        });
    } else {
      attachPlaybackSource(streamUrl, !isLocalBlob && streamUrl.includes('.m3u8'));
    }

    return () => {
      cancelled = true;
      fallbackHandlerRef.current = null;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoId, streamUrl, locale, retrySignal]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVideoSurfaceClick = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          bumpControlsVisibility();
        })
        .catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
      return;
    }
    if (controlsVisible) {
      setControlsVisible(false);
      clearHideTimer();
    } else {
      bumpControlsVisibility();
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          bumpControlsVisibility();
        })
        .catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
    } else {
      video.pause();
      setIsPlaying(false);
      setControlsVisible(true);
      clearHideTimer();
    }
  };

  const seekBy = (deltaSeconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(video.duration || Infinity, video.currentTime + deltaSeconds));
    if (Number.isFinite(target)) {
      video.currentTime = target;
      setCurrentTime(target);
      bumpControlsVisibility();
    }
  };

  const handleSeekInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const video = videoRef.current;
    if (!video || !Number.isFinite(val)) return;
    video.currentTime = val;
    setCurrentTime(val);
    bumpControlsVisibility();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && video.volume === 0) {
      video.volume = 0.8;
      setVolume(0.8);
    }
    bumpControlsVisibility();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVol = Number(e.target.value);
    const video = videoRef.current;
    if (!video || !Number.isFinite(nextVol)) return;
    video.volume = nextVol;
    video.muted = nextVol === 0;
    setVolume(nextVol);
    setIsMuted(nextVol === 0);
    bumpControlsVisibility();
  };

  const cycleSpeed = () => {
    const idx = SPEED_OPTIONS.indexOf(playbackRate);
    const nextRate = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setPlaybackRate(nextRate);
    const video = videoRef.current;
    if (video) {
      video.playbackRate = nextRate;
    }
    bumpControlsVisibility();
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!container) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else if (video?.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    } catch {
      if (video?.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    }
    bumpControlsVisibility();
  };

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const bufferedPct = duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;
  const showControls = controlsVisible || !isPlaying;

  return (
    <div
      ref={containerRef}
      data-testid="drama-video-player"
      onMouseMove={bumpControlsVisibility}
      onTouchStart={bumpControlsVisibility}
      className={`group relative w-full overflow-hidden bg-black select-none ${
        isFullscreen
          ? 'h-screen w-screen rounded-none'
          : theaterMode
            ? 'aspect-video max-h-[78vh] rounded-2xl border border-slate-800 shadow-2xl'
            : 'aspect-video rounded-2xl border border-slate-200 shadow-lg dark:border-slate-800'
      }`}
    >
      <video
        ref={videoRef}
        poster={thumbnail || undefined}
        playsInline
        preload="metadata"
        onClick={handleVideoSurfaceClick}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          if (Number.isFinite(el.duration)) setDuration(el.duration);
          setIsBuffering(false);
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setCurrentTime(el.currentTime);
          if (Number.isFinite(el.duration)) setDuration(el.duration);
          if (el.buffered.length > 0) {
            setBufferedEnd(el.buffered.end(el.buffered.length - 1));
          }
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setControlsVisible(true);
          clearHideTimer();
        }}
        onError={() => {
          if (fallbackHandlerRef.current?.()) {
            return;
          }
          const msg = errorDetail || t.streamAccessErrorLabel;
          setHasError(true);
          setIsBuffering(false);
          onStreamErrorRef.current?.({ status: errorStatus, message: msg });
        }}
        className={`h-full w-full cursor-pointer transition-all duration-200 ${
          fillScreen ? 'object-cover' : 'object-contain'
        }`}
      />

      {/* Buffering indicator */}
      {isBuffering && !hasError && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/25">
          <div className="h-12 w-12 animate-spin rounded-full border-3 border-white/25 border-t-red-600" />
        </div>
      )}

      {/* Stream Error Overlay (no retry buttons) */}
      {hasError && (
        <div
          data-testid="player-error-overlay"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/90 px-6 text-center text-white"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600/20 text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <p className="max-w-md text-sm font-semibold text-slate-200">
            {errorDetail || t.errorTitle}
          </p>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/15 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/25"
            >
              <BackArrow className="h-4 w-4" />
              <span>{t.backToList}</span>
            </button>
          )}
        </div>
      )}

      {/* Center Play Button when paused */}
      {!isPlaying && !isBuffering && !hasError && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={t.playerPlay}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/35"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-2xl transition-transform hover:scale-105">
            <Play className="h-7 w-7 fill-white ms-0.5" />
          </span>
        </button>
      )}

      {/* Top Overlay: Back button + Title — auto-hides in lockstep with bottom controls */}
      <div
        data-testid="player-top-bar"
        className={`absolute inset-x-0 top-0 z-20 flex items-center gap-2.5 bg-gradient-to-b from-black/75 via-black/30 to-transparent px-3 pt-3 pb-8 transition-opacity duration-200 sm:px-4 ${
          showControls ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {onBack && (
          <button
            type="button"
            onClick={() => {
              if (document.fullscreenElement) {
                void document.exitFullscreen().catch(() => {});
              }
              onBack();
            }}
            aria-label={t.backToList}
            data-testid="player-back-button"
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/80 ${
              showControls ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
          >
            <BackArrow className="h-5 w-5" />
          </button>
        )}
        <p className="pointer-events-none min-w-0 flex-1 truncate text-xs font-semibold text-white drop-shadow sm:text-sm">
          {title}
        </p>
      </div>

      {/* Bottom Controls Bar */}
      <div
        data-testid="player-controls-bar"
        className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pt-8 pb-2.5 text-white transition-opacity duration-200 sm:px-4 sm:pb-3 ${
          showControls ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {/* Scrubbable Progress Slider */}
        <div dir="ltr" className="relative mb-2 flex h-5 items-center">
          <div className="pointer-events-none relative h-1.5 w-full overflow-hidden rounded-full bg-white/25">
            <div
              className="absolute inset-y-0 left-0 bg-white/35"
              style={{ width: `${bufferedPct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-red-600"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={Math.min(currentTime, duration || 100)}
            onChange={handleSeekInput}
            aria-label={title}
            dir="ltr"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        {/* Control Buttons Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? t.playerPause : t.playerPlay}
              data-testid="player-play-toggle"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/15"
            >
              {isPlaying ? <Pause className="h-4 w-4 fill-white" /> : <Play className="h-4 w-4 fill-white" />}
            </button>

            <button
              type="button"
              onClick={() => seekBy(-10)}
              aria-label={t.playerSeekBack}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/15"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => seekBy(10)}
              aria-label={t.playerSeekForward}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/15"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? t.playerUnmute : t.playerMute}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/15"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label={t.playerMute}
                dir="ltr"
                className="hidden h-1 w-16 cursor-pointer accent-red-600 sm:block"
              />
            </div>

            <span dir="ltr" className="ms-1 tabular-nums text-[11px] font-medium text-white/90 sm:text-xs">
              {formatVideoDuration(currentTime)} / {formatVideoDuration(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={cycleSpeed}
              aria-label={t.playerSpeed}
              className="inline-flex h-8 items-center justify-center rounded-lg bg-white/10 px-2 tabular-nums text-xs font-semibold text-white transition-colors hover:bg-white/20"
            >
              {playbackRate}x
            </button>

            <button
              type="button"
              onClick={() => {
                setFillScreen((v) => !v);
                bumpControlsVisibility();
              }}
              aria-label={fillScreen ? t.playerFitScreen : t.playerFillScreen}
              title={fillScreen ? t.playerFitScreen : t.playerFillScreen}
              data-testid="player-stretch-button"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                fillScreen ? 'bg-red-600 text-white' : 'text-white hover:bg-white/15'
              }`}
            >
              <MoveHorizontal className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onToggleTheater}
              aria-label={theaterMode ? t.playerDefaultView : t.playerTheater}
              title={theaterMode ? t.playerDefaultView : t.playerTheater}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/15 xl:inline-flex"
            >
              <RectangleHorizontal className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label={isFullscreen ? t.playerExitFullscreen : t.playerFullscreen}
              title={isFullscreen ? t.playerExitFullscreen : t.playerFullscreen}
              data-testid="player-fullscreen-button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/15"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
