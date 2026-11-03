import React, { useState, useEffect } from 'react';
import {
  Camera,
  Video,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  ImageOff
} from 'lucide-react';
import { MediaItem } from '../types/wayfinding';

interface MediaGalleryViewerProps {
  media?: MediaItem[];
  title: string;
}

function getEmbedVideoUrl(url: string): string | null {
  try {
    const trimmed = url.trim();
    // YouTube watch?v= or youtu.be/ or youtube.com/embed/
    const ytMatch = trimmed.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    // Vimeo
    const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    return null;
  } catch {
    return null;
  }
}

export const MediaGalleryViewer: React.FC<MediaGalleryViewerProps> = ({
  media = [],
  title,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Reset active index when switching between different blocks/stations
  useEffect(() => {
    setActiveIndex(0);
    setIsLightboxOpen(false);
  }, [title, media.length]);

  if (!media || media.length === 0) {
    return (
      <div className="mb-3.5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-3.5 flex items-center gap-3 text-slate-400">
        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-400">
          <ImageOff className="w-4 h-4" />
        </div>
        <div className="text-[11px] leading-snug">
          <p className="font-bold text-slate-600">
            Sin foto o vídeo de referencia
          </p>
          <p className="text-slate-400">
            El administrador puede subir fotos o vídeos de este espacio desde el botón <b>Admin</b>.
          </p>
        </div>
      </div>
    );
  }

  const safeIndex = Math.min(activeIndex, media.length - 1);
  const current = media[safeIndex];
  const embedUrl =
    current.type === 'video' ? getEmbedVideoUrl(current.url) : null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % media.length);
  };

  const renderMediaPlayer = (item: MediaItem, isLarge = false) => {
    const itemEmbed = item.type === 'video' ? getEmbedVideoUrl(item.url) : null;
    const heightClass = isLarge ? 'max-h-[75vh] w-auto max-w-full' : 'h-44 w-full';

    if (item.type === 'video') {
      if (itemEmbed) {
        return (
          <iframe
            src={itemEmbed}
            title={item.caption || title}
            className={`${isLarge ? 'w-full h-[65vh]' : 'w-full h-44'} rounded-xl border-0 bg-slate-950`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }
      return (
        <video
          src={item.url}
          controls
          playsInline
          className={`${heightClass} object-cover rounded-xl bg-slate-950`}
        />
      );
    }

    return (
      <img
        src={item.url}
        alt={item.caption || title}
        onClick={() => !isLarge && setIsLightboxOpen(true)}
        className={`${
          isLarge
            ? 'max-h-[78vh] w-auto max-w-full object-contain rounded-2xl'
            : 'h-44 w-full object-cover cursor-zoom-in'
        } transition`}
      />
    );
  };

  return (
    <>
      <div className="mb-3.5 rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-950 relative group">
        {/* Media Content */}
        <div className="relative flex items-center justify-center bg-slate-900">
          {renderMediaPlayer(current, false)}

          {/* Top-Left Badge (Photo / Video + Counter) */}
          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-slate-900/75 backdrop-blur-md text-white text-[10px] font-extrabold flex items-center gap-1.5 pointer-events-none">
            {current.type === 'video' ? (
              <>
                <Video className="w-3 h-3 text-amber-400" />
                <span>VÍDEO</span>
              </>
            ) : (
              <>
                <Camera className="w-3 h-3 text-sky-400" />
                <span>FOTO</span>
              </>
            )}
            {media.length > 1 && (
              <span className="text-slate-300">
                • {safeIndex + 1}/{media.length}
              </span>
            )}
          </div>

          {/* Top-Right Fullscreen Expand Button */}
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-900/75 hover:bg-slate-900 text-white backdrop-blur-md transition"
            title="Ver en pantalla completa"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Left / Right Navigation Arrows if multiple items */}
          {media.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white backdrop-blur-md transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white backdrop-blur-md transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Optional Caption or Thumbnail Strip */}
        {(current.caption || media.length > 1) && (
          <div className="bg-slate-900 px-3 py-2 flex items-center justify-between gap-2 border-t border-slate-800">
            <p className="text-[11px] text-slate-200 font-medium line-clamp-1">
              {current.caption || title}
            </p>
            {media.length > 1 && (
              <div className="flex items-center gap-1 shrink-0">
                {media.map((m, idx) => (
                  <button
                    key={m.id || idx}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={`w-2 h-2 rounded-full transition ${
                      idx === safeIndex
                        ? 'bg-blue-400 w-4'
                        : 'bg-slate-600 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl flex flex-col items-center"
          >
            {/* Top Bar */}
            <div className="w-full flex items-center justify-between text-white mb-3 px-1">
              <div>
                <h4 className="text-sm sm:text-base font-extrabold">{title}</h4>
                {current.caption && (
                  <p className="text-xs text-slate-300">{current.caption}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Large Media */}
            <div className="relative w-full flex items-center justify-center">
              {renderMediaPlayer(current, true)}

              {media.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/15 transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/15 transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
