const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootPath = path.join(__dirname, '../..');
const appPath = path.join(rootPath, 'release', 'app');
const appNodeModulesPath = path.join(appPath, 'node_modules');
const { dependencies } = require(path.join(appPath, 'package.json'));

function resolveElectronVersion() {
  const electronPkg = path.join(
    rootPath,
    'node_modules',
    'electron',
    'package.json',
  );
  if (!fs.existsSync(electronPkg)) {
    throw new Error(
      'electron is not installed; run npm install in the project root first',
    );
  }
  return JSON.parse(fs.readFileSync(electronPkg, 'utf8')).version;
}

if (
  Object.keys(dependencies || {}).length > 0 &&
  fs.existsSync(appNodeModulesPath)
) {
  const electronVersion = resolveElectronVersion();
  const electronRebuildCmd = [
    path.join(rootPath, 'node_modules', '.bin', 'electron-rebuild'),
    '--force',
    '--types prod,dev,optional',
    '--module-dir .',
    `--version=${electronVersion}`,
  ].join(' ');
  const cmd =
    process.platform === 'win32'
      ? electronRebuildCmd.replace(/\//g, '\\')
      : electronRebuildCmd;
  execSync(cmd, {
    cwd: appPath,
    stdio: 'inherit',
  });

  if (process.platform === 'darwin') {
    const spawnHelperPath = path.join(
      appNodeModulesPath,
      'node-pty',
      'build',
      'Release',
      'spawn-helper',
    );
    if (fs.existsSync(spawnHelperPath)) {
      const fileOutput = execFileSync('/usr/bin/file', ['-b', spawnHelperPath], {
        encoding: 'utf8',
      });
      const helperArch = fileOutput.includes('arm64')
        ? 'arm64'
        : fileOutput.includes('x86_64')
          ? 'x64'
          : null;
      const runtimeArch = process.arch === 'arm64' ? 'arm64' : 'x64';
      if (helperArch && helperArch !== runtimeArch) {
        throw new Error(
          `node-pty spawn-helper is ${helperArch} but this machine is ${runtimeArch}. ` +
            'Re-run npm install under the native architecture (avoid Rosetta npm), then npm run rebuild.',
        );
      }
    }
  }
}
