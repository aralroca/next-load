import { ParsedFilePkg } from "./types";
import { interceptExport, removeCommentsFromCode, colorRed, colorOrange, isPageOfTheList } from "./utils";

const clientLine = ['"use client"', "'use client'"]

type TransformParams = {
  code: string,
  hash: string,
  pageVariableName: string,
  pathname?: string,
  hasLoad?: boolean,
  hasHydrate?: boolean,
}

type TransformOptions = {
  pageNoExt?: string,
  normalizedResourcePath?: string,
  normalizedPagesPath?: string,
  hydraters?: (string | RegExp)[],
  loaders?: (string | RegExp)[],
}

const moreHydrateInfo = 'For more information, please refer to the documentation provided at https://github.com/aralroca/next-load#hydrate.'

export default function transformer(pagePkg: ParsedFilePkg, { pageNoExt = '/', normalizedResourcePath = '', normalizedPagesPath = '', hydraters = [], loaders = [] }: TransformOptions) {
  let code = pagePkg.getCode()
  const codeWithoutComments = removeCommentsFromCode(code).trim()
  const isClientCode = clientLine.some(line => codeWithoutComments.startsWith(line))
  const isPage = pageNoExt.endsWith('/page') && normalizedResourcePath.startsWith(normalizedPagesPath)

  // server components are not needed to be transformed
  if (!isPage && !isClientCode) return code

  const hash = Date.now().toString(16)
  const pathname = pageNoExt.replace('/page', '') || '/'

  // Removes the export default from the page
  // and tells under what name we can get the old export
  const pageVariableName = interceptExport(pagePkg, 'default', `__Next_Load__Page__${hash}__`)
  const hasLoad = isPageOfTheList(pathname, loaders)
  const hasHydrate = isPageOfTheList(pathname, hydraters)
  const pageWithoutLoadExport = isPage && !hasLoad

  // The "hydrate export" function is exclusively accessible within a server page
  if (isPage && isClientCode && hasHydrate) {
    console.log(colorRed('[next-load] ERROR '), colorOrange(`The "hydrate export" function is exclusively accessible within a server page. To achieve similar functionality, utilize the "load export" function. ${moreHydrateInfo}`))
  }

  // The function "hydrate export" can only be accessed through the use of "load export"
  if (isPage && !isClientCode && !hasLoad && hasHydrate) {
    console.log(colorRed('[next-load] ERROR '), colorOrange(`The function "hydrate export" can only be accessed through the use of "load export". ${moreHydrateInfo}`))
  }

  // No need any transformation
  if (!pageVariableName || pageWithoutLoadExport) return code

  // Get the new code after intercepting the export
  code = pagePkg.getCode()

  if (isClientCode && !isPage) return transformClientComponent({ code, hash, pageVariableName })
  if (isClientCode && isPage) return transformClientPage({ code, hash, pageVariableName, pathname, hasLoad })
  return transformServerPage({ code, hash, pageVariableName, pathname, hasLoad, hasHydrate })
}

function transformServerPage({ code, hash, pageVariableName, pathname, hasLoad, hasHydrate }: TransformParams) {
  const load = `Promise.resolve(${hasLoad ? `__nl_load(props, '${pathname}', __next_load_config)` : ''})`
  const hydrate = `Promise.resolve(${hasHydrate ? `__nl_hydrate(_data, '${pathname}', __next_load_config)` : '_data'})`

  return `
  import * as __react from 'react'
  import __next_load_config from '@next-load-root/next.load'
  import { __nl_load, __nl_hydrate } from 'next-load'

  ${code}

  export default async function __Next_Load_new__${hash}__(props) {
    const _data = await ${load}
    const _dataToHydrate = await ${hydrate}
    globalThis.__NEXT_LOAD__ = { hydrate: _data, page: '${pathname}' }
    return (
      <>
        <div 
          id="__NEXT_LOAD_DATA__"
          data-testid="__NEXT_LOAD_DATA__"
          data-hydrate={JSON.stringify(_dataToHydrate)}
          data-page="${pathname}"
        />
        <${pageVariableName} {...props} />
      </>
    )
  }
`
}

function transformClientPage({ code, hash, pageVariableName, pathname, hasLoad }: TransformParams) {
  const load = `Promise.resolve(${hasLoad ? `__nl_load(props, '${pathname}', __next_load_config)` : ''})`
  let clientCode = code
  const topLine = clientLine[0]

  // Clear current "use client" top line
  clientLine.forEach(line => { clientCode = clientCode.replace(line, '') })

  return `${topLine}
    import { useSearchParams as __useSearchParams } from 'next/navigation'
    import * as __react from 'react'
    import __next_load_config from '@next-load-root/next.load'
    import { __nl_load } from 'next-load'

    ${clientCode}

    export default function __Next_Load_new__${hash}__(props) {
      const forceUpdate = __react.useReducer(() => [])[1]
      const page = '${pathname}'
      const isServer = typeof window === 'undefined'

      __react.useEffect(() => {
        const shouldLoad = page !== window.__NEXT_LOAD__?.page
        if (!shouldLoad) return

        ${load}.then(_data => {
          window.__NEXT_LOAD__ = { hydrate: _data, page }
          forceUpdate()
        }).catch(err => console.log(err))
      }, [])

      if (isServer || !window.__NEXT_LOAD__) return null
      
      return <${pageVariableName} {...props} />
    }
  `
}

function transformClientComponent({ code, hash, pageVariableName }: TransformParams) {
  let clientCode = code
  const topLine = clientLine[0]

  // Clear current "use client" top line
  clientLine.forEach(line => { clientCode = clientCode.replace(line, '') })

  return `${topLine}
    import { _useHydrate } from 'next-load'

    ${clientCode}

    export default function __Next_Load_new__${hash}__(props) {
      _useHydrate()
      return <${pageVariableName} {...props} />
    }
  `
}
