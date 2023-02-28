import fs from 'fs'
import path from 'path'
import type webpack from 'webpack'
import type { NextConfig } from 'next'

import { LoaderOptions } from './types'
import { createConfigFileIfNotExists, extensionsRgx, getLoadersAndHydratorsLists } from './utils'

const possiblePageDirs = ['app', 'src/app']
const filename = 'next.load'

function nextLoadPlugin(nextConfig: NextConfig = {}): NextConfig {
  if (!nextConfig?.experimental?.appDir) return nextConfig

  const basePath = pkgDir()

  // NEXT_LOAD_PATH env is supported both relative and absolute path
  const dir = path.resolve(
    path.relative(basePath, process.env.NEXT_LOAD_PATH || '.')
  )

  // Next-load config file
  const nextLoadConfigFilename = fs.readdirSync(dir).find(file => file.startsWith(filename + '.')) || filename + '.js'
  createConfigFileIfNotExists(dir, nextLoadConfigFilename)

  // Loaders & Hydrators
  const { loaders, hydraters } = getLoadersAndHydratorsLists(dir, nextLoadConfigFilename)

  // app or src/app
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
      if (!config.resolve) config.resolve = {}
      if (!config.module) config.module = {}
      if (!config.module.rules) config.module.rules = []

      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        '@next-load-root': path.resolve(dir),
      }

      config.module.rules.push({
        test: extensionsRgx,
        use: {
          loader: 'next-load-plugin/loader',
          options: {
            basePath,
            pagesPath: path.join(pagesPath, '/'),
            loaders,
            hydraters,
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
