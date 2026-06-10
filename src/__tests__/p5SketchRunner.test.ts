import type p5 from 'p5';
import { compileP5Sketch } from '../renderer/lib/p5SketchRunner';

describe('p5SketchRunner', () => {
  it('binds setup/draw from global sketch code', () => {
    const p = {
      createCanvas: jest.fn(),
      background: jest.fn(),
    } as unknown as p5;

    const sketch = compileP5Sketch(`
      function setup() { createCanvas(400, 400); }
      function draw() { background(220); }
    `);
    sketch(p);

    expect(typeof (p as unknown as { setup?: () => void }).setup).toBe(
      'function',
    );
    expect(typeof (p as unknown as { draw?: () => void }).draw).toBe(
      'function',
    );

    (p as unknown as { setup: () => void }).setup();
    (p as unknown as { draw: () => void }).draw();

    expect(p.createCanvas).toHaveBeenCalledWith(400, 400);
    expect(p.background).toHaveBeenCalledWith(220);
  });

  it('throws on syntax errors at compile time', () => {
    expect(() => compileP5Sketch('function setup( {')).toThrow();
  });

  it('reports runtime errors via callback', () => {
    const onError = jest.fn();
    const p = {} as unknown as p5;
    const sketch = compileP5Sketch(
      `
      function setup() {
        throw new Error('boom');
      }
    `,
      onError,
    );
    sketch(p);
    expect(() => (p as unknown as { setup: () => void }).setup()).toThrow();
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
