import type {
  CsvChartMode,
  CsvChartType2d,
  CsvQueryColumn,
} from '../../shared/types/csvQuery';

export interface CsvChartConfig {
  mode: CsvChartMode;
  chartType2d: CsvChartType2d;
  xColumn: string;
  yColumn: string;
  zColumn: string;
  measures: string[];
}

export interface PlotlyFigure {
  data: Record<string, unknown>[];
  layout: Record<string, unknown>;
}

function isNumericColumn(
  rows: Record<string, unknown>[],
  column: string,
): boolean {
  if (!column) return false;
  let checked = 0;
  for (const row of rows) {
    const value = row[column];
    if (value == null || value === '') continue;
    if (typeof value === 'number' && Number.isFinite(value)) {
      checked += 1;
      continue;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return false;
    checked += 1;
    if (checked >= 8) break;
  }
  return checked > 0;
}

export function listNumericColumns(
  rows: Record<string, unknown>[],
  columns: CsvQueryColumn[],
): string[] {
  return columns
    .map((column) => column.name)
    .filter((name) => isNumericColumn(rows, name));
}

export function listDimensionColumns(
  rows: Record<string, unknown>[],
  columns: CsvQueryColumn[],
): string[] {
  return columns
    .map((column) => column.name)
    .filter((name) => !isNumericColumn(rows, name) || hasFewDistinctValues(rows, name));
}

function hasFewDistinctValues(
  rows: Record<string, unknown>[],
  column: string,
): boolean {
  const distinct = new Set<unknown>();
  for (const row of rows) {
    distinct.add(row[column]);
    if (distinct.size > 48) return false;
  }
  return distinct.size > 0;
}

function columnValues(rows: Record<string, unknown>[], column: string): unknown[] {
  return rows.map((row) => row[column]);
}

function toNumbers(values: unknown[]): (number | null)[] {
  return values.map((value) => {
    if (value == null || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });
}

function traceType2d(chartType: CsvChartType2d): string {
  if (chartType === 'bar') return 'bar';
  if (chartType === 'scatter') return 'scatter';
  return 'scatter';
}

function defaultChartConfig(
  columns: CsvQueryColumn[],
  rows: Record<string, unknown>[],
): CsvChartConfig {
  const numeric = listNumericColumns(rows, columns);
  const dimensions = listDimensionColumns(rows, columns);
  const xColumn = dimensions[0] ?? columns[0]?.name ?? '';
  const yColumn = dimensions[1] ?? dimensions[0] ?? '';
  const measures = numeric.slice(0, Math.min(3, numeric.length));

  return {
    mode: '2d',
    chartType2d: 'line',
    xColumn,
    yColumn,
    zColumn: measures[0] ?? '',
    measures,
  };
}

export function inferChartConfig(
  columns: CsvQueryColumn[],
  rows: Record<string, unknown>[],
): CsvChartConfig {
  if (columns.length === 0 || rows.length === 0) {
    return {
      mode: '2d',
      chartType2d: 'line',
      xColumn: '',
      yColumn: '',
      zColumn: '',
      measures: [],
    };
  }
  return defaultChartConfig(columns, rows);
}

export function buildPlotlyFigure(
  rows: Record<string, unknown>[],
  config: CsvChartConfig,
): PlotlyFigure | null {
  if (rows.length === 0) return null;

  if (config.mode === '3d') {
    const measures =
      config.measures.length > 0
        ? config.measures
        : config.zColumn
          ? [config.zColumn]
          : [];
    if (!config.xColumn || !config.yColumn || measures.length === 0) {
      return null;
    }

    const xValues = columnValues(rows, config.xColumn);
    const yValues = columnValues(rows, config.yColumn);

    const data: Record<string, unknown>[] = measures.map((measure) => ({
      type: 'scatter3d',
      mode: 'markers',
      name: measure,
      x: xValues,
      y: yValues,
      z: toNumbers(columnValues(rows, measure)),
    }));

    return {
      data,
      layout: {
        title: { text: '3D 图表' },
        scene: {
          xaxis: { title: { text: config.xColumn } },
          yaxis: { title: { text: config.yColumn } },
          zaxis: { title: { text: measures.join(', ') } },
        },
        margin: { l: 0, r: 0, t: 40, b: 0 },
      },
    };
  }

  const measures =
    config.measures.length > 0
      ? config.measures
      : config.zColumn
        ? [config.zColumn]
        : [];
  if (!config.xColumn || measures.length === 0) {
    return null;
  }

  const xValues = columnValues(rows, config.xColumn);
  const plotType = traceType2d(config.chartType2d);
  const mode =
    config.chartType2d === 'scatter' || config.chartType2d === 'line'
      ? 'lines+markers'
      : undefined;

  const data: Record<string, unknown>[] = measures.map((measure) => ({
    type: plotType,
    mode,
    name: measure,
    x: xValues,
    y: toNumbers(columnValues(rows, measure)),
  }));

  return {
    data,
    layout: {
      title: { text: '2D 图表' },
      xaxis: { title: { text: config.xColumn } },
      yaxis: { title: { text: measures.join(', ') } },
      margin: { l: 48, r: 16, t: 40, b: 48 },
      legend: { orientation: 'h', y: 1.12 },
    },
  };
}
