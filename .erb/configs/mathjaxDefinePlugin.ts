import fs from 'fs';
import path from 'path';
import webpack from 'webpack';
import webpackPaths from './webpack.paths';

/** mathjax-full version.js 用 eval 读 package.json；注入版本号以符合 Electron CSP */
export default function mathjaxDefinePlugin(): webpack.DefinePlugin {
  const pkgPath = path.join(
    webpackPaths.rootPath,
    'node_modules/mathjax-full/package.json',
  );
  const { version } = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
    version: string;
  };
  return new webpack.DefinePlugin({
    PACKAGE_VERSION: JSON.stringify(version),
  });
}
