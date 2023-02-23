import type webpack from 'webpack'

import { parseFile, getDefaultExport, extensionsRgx } from './utils'
import { LoaderOptions } from './types'
import supportLoadAndHydrate from './supportLoadAndHydrate'

export default function loader(
  this: webpack.LoaderContext<LoaderOptions>,
  rawCode: string
) {
  const { basePath, pagesPath } = this.getOptions()

  // Normalize slashes in a file path to be posix/unix-like forward slashes
  const normalizedPagesPath = pagesPath.replace(/\\/g, '/')
  const normalizedResourcePath = this.resourcePath.replace(/\\/g, '/')
  const page = normalizedResourcePath.replace(normalizedPagesPath, '/')
  const pageNoExt = page.replace(extensionsRgx, '')
  const pagePkg = parseFile(basePath, normalizedResourcePath)
  const defaultExport = getDefaultExport(pagePkg)

  // Skip any transformation if for some reason they forgot to write the
  // "export default" on the page
  if (!defaultExport) return rawCode

  return supportLoadAndHydrate(pagePkg, { pageNoExt, normalizedResourcePath, normalizedPagesPath })
}
