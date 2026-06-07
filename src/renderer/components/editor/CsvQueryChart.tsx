import { useEffect, useRef } from 'react';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { PlotlyFigure } from '../../lib/csvQueryPlotly';
import './CsvQueryChart.css';

interface CsvQueryChartProps {
  figure: PlotlyFigure | null;
}

type PlotlyModule = {
  newPlot: (
    root: HTMLElement,
    data: Record<string, unknown>[],
    layout: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<void>;
  react: (
    root: HTMLElement,
    data: Record<string, unknown>[],
    layout: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<void>;
  purge: (root: HTMLElement) => void;
};

let plotlyPromise: Promise<PlotlyModule> | null = null;

function loadPlotly(): Promise<PlotlyModule> {
  if (!plotlyPromise) {
    plotlyPromise = import('plotly.js/dist/plotly').then(
      (module) => module.default as PlotlyModule,
    );
  }
  return plotlyPromise;
}

export default function CsvQueryChart({ figure }: CsvQueryChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolved } = useAppTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let cancelled = false;

    const render = async () => {
      const Plotly = await loadPlotly();
      if (cancelled) return;

      if (!figure) {
        Plotly.purge(container);
        return;
      }

      const layout = {
        ...figure.layout,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: {
          color: resolved.ui === 'dark' ? '#e6e6e6' : '#1a1a1a',
        },
      };

      await Plotly.react(container, figure.data, layout, {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
      });
    };

    render().catch(() => undefined);

    return () => {
      cancelled = true;
      loadPlotly()
        .then((Plotly) => {
          if (containerRef.current) {
            Plotly.purge(containerRef.current);
          }
        })
        .catch(() => undefined);
    };
  }, [figure, resolved.ui]);

  if (!figure) {
    return (
      <div className="CsvQueryChart CsvQueryChart--empty">
        选择维度和度量以生成图表
      </div>
    );
  }

  return <div ref={containerRef} className="CsvQueryChart" />;
}
