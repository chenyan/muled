import { useEffect, useMemo, useRef } from 'react';
import { AnsiUp } from 'ansi_up';
import type { IpynbOutput } from '../../../../shared/types/ipynb';
import { outputText } from '../../../lib/ipynb/ipynbStreamText';
import { renderIpynbOutputsToElement } from '../../../lib/renderIpynb';

interface IpynbCellOutputProps {
  outputs: IpynbOutput[];
}

function streamOutput(
  outputs: IpynbOutput[],
  name: 'stdout' | 'stderr',
): IpynbOutput | undefined {
  for (let i = outputs.length - 1; i >= 0; i -= 1) {
    const item = outputs[i];
    if (item.output_type === 'stream' && (item.name ?? 'stdout') === name) {
      return item;
    }
  }
  return undefined;
}

export default function IpynbCellOutput({ outputs }: IpynbCellOutputProps) {
  const richRef = useRef<HTMLDivElement>(null);
  const stdoutRef = useRef<HTMLPreElement>(null);
  const stderrRef = useRef<HTMLPreElement>(null);
  const ansiUpRef = useRef<AnsiUp | null>(null);

  const stdout = useMemo(() => streamOutput(outputs, 'stdout'), [outputs]);
  const stderr = useMemo(() => streamOutput(outputs, 'stderr'), [outputs]);
  const richOutputs = useMemo(
    () => outputs.filter((o) => o.output_type !== 'stream'),
    [outputs],
  );

  useEffect(() => {
    if (!ansiUpRef.current) {
      ansiUpRef.current = new AnsiUp();
    }
    const ansiUp = ansiUpRef.current;
    const renderStream = (
      el: HTMLPreElement | null,
      item: IpynbOutput | undefined,
      className: string,
    ) => {
      if (!el) return;
      const text = outputText(item?.text);
      if (!text) {
        el.replaceChildren();
        el.hidden = true;
        return;
      }
      el.hidden = false;
      el.className = className;
      el.innerHTML = ansiUp.ansi_to_html(text);
    };
    renderStream(stdoutRef.current, stdout, 'nb-stdout');
    renderStream(stderrRef.current, stderr, 'nb-stderr');
  }, [stdout, stderr]);

  useEffect(() => {
    const container = richRef.current;
    if (!container) return undefined;
    if (!richOutputs.length) {
      container.replaceChildren();
      return undefined;
    }
    const node = renderIpynbOutputsToElement(richOutputs);
    container.replaceChildren(node);
    return () => {
      container.replaceChildren();
    };
  }, [richOutputs]);

  if (!outputs.length) return null;

  return (
    <div className="IpynbCellOutput">
      <pre ref={stdoutRef} className="nb-stdout" hidden />
      <pre ref={stderrRef} className="nb-stderr" hidden />
      <div ref={richRef} className="IpynbCellOutput__rich" />
    </div>
  );
}
