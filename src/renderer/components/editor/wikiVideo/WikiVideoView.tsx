import { useEffect, useRef, useState } from 'react';
import { resolveWikiVideoPreview } from '../../../lib/resolveWikiImagePreview';
import { getWysiwygDocumentRelativePath } from './wysiwygDocumentPathRef';

interface WikiVideoViewProps {
  src: string;
  altText: string;
}

export default function WikiVideoView({ src, altText }: WikiVideoViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveWikiVideoPreview(src, getWysiwygDocumentRelativePath())
      .then((resolved) => {
        if (!cancelled) {
          setVideoSrc(resolved);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVideoSrc(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(
    () => () => {
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    },
    [src],
  );

  if (!videoSrc) {
    return (
      <div className="MuledWikiVideo MuledWikiVideo--loading">
        正在加载视频…
      </div>
    );
  }

  return (
    <div className="MuledWikiVideo" data-editor-block-type="video">
      <video
        ref={videoRef}
        src={videoSrc}
        controls
        playsInline
        preload="metadata"
        title={altText || undefined}
      >
        您的浏览器不支持视频播放。
      </video>
    </div>
  );
}