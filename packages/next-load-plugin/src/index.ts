import fs from 'fs'
import path from 'path'
import type webpack from 'webpack'
import type { NextConfig } from 'next'

import { LoaderOptions } from './types'
import { extensionsRgx } from './utils'

const possiblePageDirs = ['app', 'src/app']

function nextLoadPlugin(nextConfig: NextConfig = {}): NextConfig {
  const basePath = pkgDir()

  // NEXT_LOAD_PATH env is supported both relative and absolute path
  const dir = path.resolve(
    path.relative(basePath, process.env.NEXT_LOAD_PATH || '.')
  )

  const pagesInDir = possiblePageDirs.find((pageDir) =>
    fs.existsSync(path.join(dir, pageDir))
  );

  if (!pagesInDir || !fs.existsSync(path.join(dir, pagesInDir))) {
    // Pages folder not found, so we're not using the loader
    return nextConfig
  }

  const pagesPath = path.join(dir, pagesInDir)

  return {
    ...nextConfig,
    webpack(conf: webpack.Configuration, options: any) {
      const config: webpack.Configuration =
        typeof nextConfig.webpack === 'function'
          ? nextConfig.webpack(conf, options)
          : conf

      // Creating some "slots" if they don't exist
      if (!config.module) config.module = {}
      if (!config.module.rules) config.module.rules = []

      config.module.rules.push({
        test: extensionsRgx,
        use: {
          loader: 'next-load-plugin/loader',
          options: {
            basePath,
            pagesPath: path.join(pagesPath, '/'),
          } as LoaderOptions,
        },
      })

      return config
    },
  }
}

function pkgDir() {
  try {
    return (require('pkg-dir').sync() as string) || process.cwd()
  } catch (e) {
    return process.cwd()
  }
}

module.exports = nextLoadPlugin
export default nextLoadPlugin
