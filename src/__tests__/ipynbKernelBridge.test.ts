import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PYTHON_KERNEL_BRIDGE_SOURCE } from '../main/services/ipynb/pythonKernelBridgeScript';

function writeBridgeToTemp(): string {
  const target = path.join(
    os.tmpdir(),
    `muled-bridge-test-${process.pid}.py`,
  );
  fs.writeFileSync(target, PYTHON_KERNEL_BRIDGE_SOURCE, { encoding: 'utf8' });
  return target;
}

describe('PYTHON_KERNEL_BRIDGE_SOURCE', () => {
  it('is valid Python (no template-literal escape corruption)', () => {
    const target = writeBridgeToTemp();
    try {
      const result = spawnSync('python3', ['-m', 'py_compile', target], {
        encoding: 'utf8',
      });
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
    } finally {
      fs.rmSync(target, { force: true });
      fs.rmSync(`${target}c`, { force: true });
    }
  });

  it('preserves escaped stream delimiters in source text', () => {
    expect(PYTHON_KERNEL_BRIDGE_SOURCE).toContain('or "\\n" in s');
    expect(PYTHON_KERNEL_BRIDGE_SOURCE).toContain('or "\\r" in s');
    expect(PYTHON_KERNEL_BRIDGE_SOURCE).toContain('or "\\x1b" in s');
  });

  it('streams print() output on the protocol stdout during execute', () => {
    const target = writeBridgeToTemp();
    const proc = spawnSync(
      'python3',
      ['-u', target],
      {
        encoding: 'utf8',
        input: `${JSON.stringify({
          type: 'execute',
          cell_id: 'cell-1',
          code: 'print("hello from print")',
        })}\n`,
        timeout: 15000,
      },
    );
    try {
      expect(proc.status).toBe(0);
      const lines = proc.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const streamLine = lines.find((line) => {
        try {
          return JSON.parse(line).type === 'stream';
        } catch {
          return false;
        }
      });
      expect(streamLine).toBeDefined();
      const streamMsg = JSON.parse(streamLine!);
      expect(streamMsg.text).toContain('hello from print');
    } finally {
      fs.rmSync(target, { force: true });
    }
  });

  it('returns namespace variables on inspect', () => {
    const target = writeBridgeToTemp();
    const proc = spawnSync(
      'python3',
      ['-u', target],
      {
        encoding: 'utf8',
        input: [
          JSON.stringify({
            type: 'execute',
            cell_id: 'cell-1',
            code: 'x = 42\nname = "muled"',
          }),
          JSON.stringify({ type: 'inspect', request_id: 'req-1' }),
        ].join('\n') + '\n',
        timeout: 15000,
      },
    );
    try {
      expect(proc.status).toBe(0);
      const lines = proc.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const inspectLine = lines.find((line) => {
        try {
          return JSON.parse(line).type === 'inspect_reply';
        } catch {
          return false;
        }
      });
      expect(inspectLine).toBeDefined();
      const inspectMsg = JSON.parse(inspectLine!);
      expect(inspectMsg.request_id).toBe('req-1');
      expect(typeof inspectMsg.memory_bytes === 'number' || inspectMsg.memory_bytes === null).toBe(
        true,
      );
      const names = inspectMsg.variables.map((item: { name: string }) => item.name);
      expect(names).toContain('x');
      expect(names).toContain('name');
      const xVar = inspectMsg.variables.find((item: { name: string }) => item.name === 'x');
      expect(xVar.value).toBe('42');
    } finally {
      fs.rmSync(target, { force: true });
    }
  });
});
