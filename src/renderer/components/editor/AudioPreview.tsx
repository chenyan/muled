import { useEffect, useRef } from 'react';
import type { EditorTab } from '../../types/tab';
import { tabLabel } from '../../types/tab';

interface AudioPreviewProps {
  tab: EditorTab;
}

export default function AudioPreview({ tab }: AudioPreviewProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(
    () => () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
    },
    [tab.id],
  );

  if (!tab.audioSrc) {
    return (
      <div className="AudioPreview AudioPreview--empty">
        {tab.relativePath ? '正在加载音频…' : '无法加载音频'}
      </div>
    );
  }

  const name = tab.relativePath ? tabLabel(tab) : 'audio';

  return (
    <div className="AudioPreview">
      <div className="AudioPreview__toolbar">
        <span
          className="AudioPreview__name"
          title={tab.relativePath ?? undefined}
        >
          {name}
        </span>
      </div>
      <div className="AudioPreview__viewport">
        <audio ref={audioRef} src={tab.audioSrc} controls preload="metadata">
          您的浏览器不支持音频播放。
        </audio>
      </div>
    </div>
  );
}
