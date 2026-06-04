import {
  prepareMarkdownForWysiwyg,
  prepareMarkdownForWysiwygLegacy,
} from '../renderer/lib/prepareMarkdownForWysiwyg';
import { buildLargeMarkdownFixture } from '../renderer/lib/wysiwygPrepareFixture';

describe('prepareMarkdownForWysiwyg', () => {
  it('matches legacy pipeline on representative content', () => {
    const samples = [
      '行内 $E=mc^2$ 与 $$\\int_0^1 x dx$$',
      '比较 a < b，保留 <br>，书名 <中国震撼世界>',
      '![[img.png|alt]] 与 [[page|标签]]',
      buildLargeMarkdownFixture({
        paragraphCount: 80,
        codeBlockCount: 8,
        inlineMathPerParagraph: 1,
      }),
    ];

    for (const source of samples) {
      expect(prepareMarkdownForWysiwyg(source)).toBe(
        prepareMarkdownForWysiwygLegacy(source),
      );
    }
  });
});

function medianMs(run: () => void, iterations: number): number {
  const samples: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    const t0 = performance.now();
    run();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

describe('prepareMarkdownForWysiwyg performance', () => {
  const fixture = buildLargeMarkdownFixture({
    paragraphCount: 500,
    codeBlockCount: 50,
    inlineMathPerParagraph: 2,
  });
  const iterations = 12;

  it('reports merged prepare vs legacy and single vs double load', () => {
    const legacyOnce = medianMs(
      () => prepareMarkdownForWysiwygLegacy(fixture),
      iterations,
    );
    const mergedOnce = medianMs(
      () => prepareMarkdownForWysiwyg(fixture),
      iterations,
    );
    const legacyDoubleLoad = medianMs(() => {
      prepareMarkdownForWysiwygLegacy(fixture);
      prepareMarkdownForWysiwygLegacy(fixture);
    }, iterations);
    const mergedSingleLoad = mergedOnce;

    const prepareSpeedup = legacyOnce / mergedOnce;
    const loadPathSpeedup = legacyDoubleLoad / mergedSingleLoad;

    // eslint-disable-next-line no-console
    console.log(
      [
        '[wysiwyg-prepare-bench]',
        `fixtureChars=${fixture.length}`,
        `legacyOnceMs=${legacyOnce.toFixed(2)}`,
        `mergedOnceMs=${mergedOnce.toFixed(2)}`,
        `prepareSpeedup=${prepareSpeedup.toFixed(2)}x`,
        `legacyDoubleLoadMs=${legacyDoubleLoad.toFixed(2)}`,
        `mergedSingleLoadMs=${mergedSingleLoad.toFixed(2)}`,
        `loadPathSpeedup=${loadPathSpeedup.toFixed(2)}x`,
      ].join(' '),
    );

    expect(mergedOnce).toBeLessThan(legacyOnce);
    expect(mergedSingleLoad).toBeLessThan(legacyDoubleLoad);
  });
});
