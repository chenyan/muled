import { listKernelSpecs } from '../main/services/ipynb/kernelFinder';

describe('listKernelSpecs', () => {
  it('dedupes symlinked interpreters and includes path in displayName', () => {
    const kernels = listKernelSpecs('');
    if (kernels.length === 0) {
      return;
    }
    const realPaths = new Set(
      kernels.map((kernel) => kernel.pythonPath.toLowerCase()),
    );
    expect(realPaths.size).toBe(kernels.length);
    for (const kernel of kernels) {
      expect(kernel.displayName).toContain('·');
      expect(kernel.displayName).toMatch(/Python .+ \((IPython|stdlib)\)/);
    }
  });
});
