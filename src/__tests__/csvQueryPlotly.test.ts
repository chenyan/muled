import {
  buildPlotlyFigure,
  inferChartConfig,
  listNumericColumns,
} from '../renderer/lib/csvQueryPlotly';

describe('csvQueryPlotly', () => {
  const columns = [
    { name: 'category', type: 'VARCHAR' },
    { name: 'region', type: 'VARCHAR' },
    { name: 'sales', type: 'DOUBLE' },
    { name: 'profit', type: 'DOUBLE' },
  ];

  const rows = [
    { category: 'A', region: 'East', sales: 10, profit: 2 },
    { category: 'B', region: 'West', sales: 20, profit: 5 },
    { category: 'C', region: 'East', sales: 15, profit: 3 },
  ];

  it('detects numeric columns', () => {
    expect(listNumericColumns(rows, columns)).toEqual(['sales', 'profit']);
  });

  it('builds a multi-measure 2D figure', () => {
    const config = inferChartConfig(columns, rows);
    const figure = buildPlotlyFigure(rows, {
      ...config,
      xColumn: 'category',
      measures: ['sales', 'profit'],
      mode: '2d',
      chartType2d: 'line',
    });

    expect(figure?.data).toHaveLength(2);
    expect(figure?.data[0]).toMatchObject({
      name: 'sales',
      type: 'scatter',
      x: ['A', 'B', 'C'],
    });
  });

  it('builds a 3D figure with two dimensions and one measure', () => {
    const figure = buildPlotlyFigure(rows, {
      mode: '3d',
      chartType2d: 'scatter',
      xColumn: 'category',
      yColumn: 'region',
      zColumn: 'sales',
      measures: ['sales'],
    });

    expect(figure?.data).toHaveLength(1);
    expect(figure?.data[0]).toMatchObject({
      type: 'scatter3d',
      x: ['A', 'B', 'C'],
      y: ['East', 'West', 'East'],
      z: [10, 20, 15],
    });
  });
});
