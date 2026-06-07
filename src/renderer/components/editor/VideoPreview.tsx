import { useEffect, useRef } from 'react';
import type { EditorTab } from '../../types/tab';
import { tabLabel } from '../../types/tab';

interface VideoPreviewProps {
  tab: EditorTab;
}

export default function VideoPreview({ tab }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(
    () => () => {
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    },
    [tab.id],
  );

  if (!tab.videoSrc) {
    return (
      <div className="VideoPreview VideoPreview--empty">
        {tab.relativePath ? '正在加载视频…' : '无法加载视频'}
      </div>
    );
  }

  const name = tab.relativePath ? tabLabel(tab) : 'video';

  return (
    <div className="VideoPreview">
      <div className="VideoPreview__toolbar">
        <span
          className="VideoPreview__name"
          title={tab.relativePath ?? undefined}
        >
          {name}
        </span>
      </div>
      <div className="VideoPreview__viewport">
        <video
          ref={videoRef}
          src={tab.videoSrc}
          controls
          preload="metadata"
          playsInline
        >
          您的浏览器不支持视频播放。
        </video>
      </div>
    </div>
  );
}
