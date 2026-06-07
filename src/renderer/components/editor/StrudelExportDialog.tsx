import { useEffect, useState } from 'react';
import {
  STRUDEL_EXPORT_DEFAULTS,
  type StrudelExportOptions,
} from '../../lib/strudelExport';
import './StrudelExportDialog.css';

interface StrudelExportDialogProps {
  open: boolean;
  defaultFileName?: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onExport: (options: StrudelExportOptions) => void;
}

export default function StrudelExportDialog({
  open,
  defaultFileName = '',
  busy = false,
  error = null,
  onClose,
  onExport,
}: StrudelExportDialogProps) {
  const [fileName, setFileName] = useState(defaultFileName);
  const [startCycle, setStartCycle] = useState(String(STRUDEL_EXPORT_DEFAULTS.startCycle));
  const [endCycle, setEndCycle] = useState(String(STRUDEL_EXPORT_DEFAULTS.endCycle));
  const [sampleRate, setSampleRate] = useState(String(STRUDEL_EXPORT_DEFAULTS.sampleRate));
  const [maxPolyphony, setMaxPolyphony] = useState(
    String(STRUDEL_EXPORT_DEFAULTS.maxPolyphony),
  );
  const [multiChannelOrbits, setMultiChannelOrbits] = useState(
    STRUDEL_EXPORT_DEFAULTS.multiChannelOrbits,
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setFileName(defaultFileName);
    setStartCycle(String(STRUDEL_EXPORT_DEFAULTS.startCycle));
    setEndCycle(String(STRUDEL_EXPORT_DEFAULTS.endCycle));
    setSampleRate(String(STRUDEL_EXPORT_DEFAULTS.sampleRate));
    setMaxPolyphony(String(STRUDEL_EXPORT_DEFAULTS.maxPolyphony));
    setMultiChannelOrbits(STRUDEL_EXPORT_DEFAULTS.multiChannelOrbits);
  }, [defaultFileName, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose, open]);

  if (!open) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onExport({
      fileName,
      startCycle: Number(startCycle),
      endCycle: Number(endCycle),
      sampleRate: Number(sampleRate),
      maxPolyphony: Number(maxPolyphony),
      multiChannelOrbits,
    });
  };

  return (
    <div
      className="StrudelExportDialog__backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <form
        className="StrudelExportDialog"
        role="dialog"
        aria-labelledby="strudel-export-title"
        aria-busy={busy}
        onSubmit={handleSubmit}
      >
        <header className="StrudelExportDialog__header">
          <h2 id="strudel-export-title" className="StrudelExportDialog__title">
            导出 WAV
          </h2>
        </header>

        <label className="StrudelExportDialog__field">
          <span className="StrudelExportDialog__label">File name</span>
          <input
            className="StrudelExportDialog__input"
            type="text"
            value={fileName}
            disabled={busy}
            placeholder="留空则使用当前日期"
            onChange={(event) => setFileName(event.target.value)}
          />
        </label>

        <div className="StrudelExportDialog__row">
          <label className="StrudelExportDialog__field">
            <span className="StrudelExportDialog__label">Start cycle</span>
            <input
              className="StrudelExportDialog__input"
              type="number"
              step="any"
              value={startCycle}
              disabled={busy}
              onChange={(event) => setStartCycle(event.target.value)}
            />
          </label>
          <label className="StrudelExportDialog__field">
            <span className="StrudelExportDialog__label">End cycle</span>
            <input
              className="StrudelExportDialog__input"
              type="number"
              step="any"
              value={endCycle}
              disabled={busy}
              onChange={(event) => setEndCycle(event.target.value)}
            />
          </label>
        </div>

        <div className="StrudelExportDialog__row">
          <label className="StrudelExportDialog__field">
            <span className="StrudelExportDialog__label">Sample rate</span>
            <input
              className="StrudelExportDialog__input"
              type="number"
              step="1"
              min="1"
              value={sampleRate}
              disabled={busy}
              onChange={(event) => setSampleRate(event.target.value)}
            />
          </label>
          <label className="StrudelExportDialog__field">
            <span className="StrudelExportDialog__label">Maximum polyphony</span>
            <input
              className="StrudelExportDialog__input"
              type="number"
              step="1"
              min="1"
              value={maxPolyphony}
              disabled={busy}
              onChange={(event) => setMaxPolyphony(event.target.value)}
            />
          </label>
        </div>

        <label className="StrudelExportDialog__checkbox">
          <input
            type="checkbox"
            checked={multiChannelOrbits}
            disabled={busy}
            onChange={(event) => setMultiChannelOrbits(event.target.checked)}
          />
          <span>Multi Channel Orbits</span>
        </label>

        {error ? (
          <p className="StrudelExportDialog__error" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="StrudelExportDialog__footer">
          <button
            type="button"
            className="StrudelExportDialog__btn StrudelExportDialog__btn--secondary"
            disabled={busy}
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="submit"
            className="StrudelExportDialog__btn StrudelExportDialog__btn--primary"
            disabled={busy}
          >
            {busy ? '导出中…' : 'Export to WAV'}
          </button>
        </footer>
      </form>
    </div>
  );
}
