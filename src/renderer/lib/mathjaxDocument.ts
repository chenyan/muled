import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';

type LiteAdaptor = ReturnType<typeof liteAdaptor>;
type MathJaxDocument = ReturnType<typeof mathjax.document>;

let documentInstance: MathJaxDocument | null = null;
let adaptorInstance: LiteAdaptor | null = null;

/** 单例 MathJax 文档，供同步 renderToString 使用 */
export function getMathJaxDocument(): {
  doc: MathJaxDocument;
  adaptor: LiteAdaptor;
} {
  if (!documentInstance || !adaptorInstance) {
    const adaptor = liteAdaptor();
    RegisterHTMLHandler(adaptor);
    const tex = new TeX({
      packages: AllPackages.sort(),
      inlineMath: [],
      displayMath: [],
    });
    const svg = new SVG({ fontCache: 'none' });
    documentInstance = mathjax.document('', {
      InputJax: tex,
      OutputJax: svg,
    });
    adaptorInstance = adaptor;
  }
  return { doc: documentInstance, adaptor: adaptorInstance };
}
