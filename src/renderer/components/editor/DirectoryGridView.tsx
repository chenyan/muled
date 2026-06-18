import { useCallback, useEffect, useRef, useState } from 'react';
import { isDirectoryPath, isImagePath } from '../../lib/mime';
import { useWheelScrollOnlyWhenGestureStartsIn } from '../../lib/wheelScrollOnlyWhenGestureStartsIn';
import type { EditorTab } from '../../types/tab';
import { tabLabel } from '../../types/tab';

interface DirectoryGridViewProps {
  tab: EditorTab;
  onOpenFile: (relativePath: string) => void;
  onOpenDirectory: (relativePath: string) => void;
}

function displayName(relativePath: string): string {
  const trimmed = relativePath.replace(/\/$/, '');
  const parts = trimmed.split('/');
  return parts[parts.length - 1] ?? relativePath;
}

function DirectoryGridCell({
  relativePath,
  onActivate,
}: {
  relativePath: string;
  onActivate: () => void;
}) {
  const isDir = isDirectoryPath(relativePath);
  const isImage = !isDir && isImagePath(relativePath);
  const name = displayName(relativePath);
  const [thumbSrc, setThumbSrc] = useState<string | null>(null);
  const [thumbFailed, setThumbFailed] = useState(false);

  useEffect(() => {
    if (!isImage) {
      setThumbSrc(null);
      setThumbFailed(false);
      return undefined;
    }

    let cancelled = false;
    setThumbSrc(null);
    setThumbFailed(false);

    window.muled.file
      .readBinary(relativePath)
      .then(({ base64, mime }) => {
        if (cancelled) return;
        setThumbSrc(`data:${mime};base64,${base64}`);
      })
      .catch(() => {
        if (!cancelled) setThumbFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isImage, relativePath]);

  const showThumb = isImage && thumbSrc && !thumbFailed;

  return (
    <button
      type="button"
      className={`DirectoryGrid__cell${isDir ? ' DirectoryGrid__cell--dir' : ''}`}
      title={relativePath}
      onClick={onActivate}
    >
      {showThumb ? (
        <img
          className="DirectoryGrid__thumb"
          src={thumbSrc}
          alt={name}
          draggable={false}
        />
      ) : isDir ? (
        <span className="DirectoryGrid__dirContent">
          <span className="DirectoryGrid__dirIcon" aria-hidden="true" />
          <span className="DirectoryGrid__label">{name}</span>
        </span>
      ) : (
        <span className="DirectoryGrid__label">{name}</span>
      )}
    </button>
  );
}

export default function DirectoryGridView({
  tab,
  onOpenFile,
  onOpenDirectory,
}: DirectoryGridViewProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  useWheelScrollOnlyWhenGestureStartsIn(gridRef);
  const directoryPath = tab.relativePath ?? '';
  const [children, setChildren] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    window.muled.workspace
      .listChildren(directoryPath)
      .then((result) => {
        if (!cancelled) {
          setChildren(result.paths);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setChildren([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [directoryPath]);

  const handleActivate = useCallback(
    (relativePath: string) => {
      if (isDirectoryPath(relativePath)) {
        onOpenDirectory(relativePath);
        return;
      }
      onOpenFile(relativePath);
    },
    [onOpenDirectory, onOpenFile],
  );

  return (
    <div ref={gridRef} className="DirectoryGrid">
      <div
        className="DirectoryGrid__grid"
        role="grid"
        aria-label={`${tabLabel(tab)} 列表`}
      >
        {children.map((childPath) => (
          <DirectoryGridCell
            key={childPath}
            relativePath={childPath}
            onActivate={() => handleActivate(childPath)}
          />
        ))}
      </div>
      {children.length === 0 ? (
        <p className="DirectoryGrid__empty">此目录为空</p>
      ) : null}
    </div>
  );
}
