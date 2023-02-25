import { ParsedFilePkg } from "./types";
import { interceptExport, getNamedExport, removeCommentsFromCode } from "./utils";
import ts from "typescript";

const clientLine = ['"use client"', "'use client'"]

type TransformParams = { code: string, hash: string, pageVariableName: string, pathname?: string, load?: ts.Expression | ts.Declaration }

export default function transformer(pagePkg: ParsedFilePkg, { pageNoExt = '/', normalizedResourcePath = '', normalizedPagesPath = '' } = {}) {
  let code = pagePkg.getCode()
  const codeWithoutComments = removeCommentsFromCode(code).trim()
  const isClientCode = clientLine.some(line => codeWithoutComments.startsWith(line))
  const isPage = pageNoExt.endsWith('/page') && normalizedResourcePath.startsWith(normalizedPagesPath)

  if (!isPage && !isClientCode) return code

  const hash = Date.now().toString(16)
  const pathname = pageNoExt.replace('/page', '') || '/'

  // Removes the export default from the page
  // and tells under what name we can get the old export
  const pageVariableName = interceptExport(pagePkg, 'default', `__Next_Load__Page__${hash}__`)

  const load = getNamedExport(pagePkg, 'load')
  const pageWithoutLoadExport = isPage && !load

  // No need any transformation
  if (!pageVariableName || pageWithoutLoadExport) return code

  // Get the new code after intercepting the export
  code = pagePkg.getCode()

  if (isClientCode && !isPage) return transformClientComponent({ code, hash, pageVariableName })
  if (isClientCode && isPage) return transformClientPage({ code, hash, pageVariableName, pathname, load })
  return transformServerPage({ code, hash, pageVariableName, pathname, load })
}

function transformServerPage({ code, hash, pageVariableName, pathname, load }: TransformParams) {
  return `
  import * as __react from 'react'

  ${code}

  export default async function __Next_Load_new__${hash}__(props) {
    const _data = ${load ? 'await load()' : 'null'}
    globalThis.__NEXT_LOAD__ = { hydrate: _data, page: '${pathname}' }
    return (
      <>
        <div 
          id="__NEXT_LOAD_DATA__"
          data-testid="__NEXT_LOAD_DATA__"
          data-hydrate={JSON.stringify(_data)}
          data-page="${pathname}"
        />
        <${pageVariableName} {...props} />
      </>
    )
  }
`
}

function transformClientPage({ code, hash, pageVariableName, pathname, load }: TransformParams) {
  let clientCode = code
  const topLine = clientLine[0]

  // Clear current "use client" top line
  clientLine.forEach(line => { clientCode = clientCode.replace(line, '') })

  return `${topLine}
    import { useSearchParams as __useSearchParams } from 'next/navigation'
    import * as __react from 'react'

    ${clientCode}

    export default function __Next_Load_new__${hash}__(props) {
      const forceUpdate = __react.useReducer(() => [])[1]
      const page = '${pathname}'
      const isServer = typeof window === 'undefined'

      __react.useEffect(() => {
        const shouldLoad = page !== window.__NEXT_LOAD__?.page
        if (!shouldLoad) return

        Promise.resolve(${load ? 'load()' : ''}).then(_data => {
          window.__NEXT_LOAD__ = { hydrate: _data, page }
          forceUpdate()
        })
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
