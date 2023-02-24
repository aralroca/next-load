import { ParsedFilePkg } from "./types";
import { interceptExport, getNamedExport, removeCommentsFromCode } from "./utils";

const clientLine = ['"use client"', "'use client'"]

export default function supportLoadAndHydrate(pagePkg: ParsedFilePkg, { hasLoadLocaleFrom = false, pageNoExt = '/', normalizedResourcePath = '', normalizedPagesPath = '' } = {}) {
  let code = pagePkg.getCode()
  const codeWithoutComments = removeCommentsFromCode(code).trim()
  const isClientCode = clientLine.some(line => codeWithoutComments.startsWith(line))
  const isPage = pageNoExt.endsWith('/page') && normalizedResourcePath.startsWith(normalizedPagesPath)

  if (!isPage && !isClientCode) return code

  const hash = Date.now().toString(16)
  const pathname = pageNoExt.replace('/page', '/')

  // Removes the export default from the page
  // and tells under what name we can get the old export
  const pageVariableName = interceptExport(
    pagePkg,
    'default',
    `__Next_Load__Page__${hash}__`
  )

  const load = getNamedExport(pagePkg, 'load')
  const pageWithoutLoadExport = isPage && !load

  if (!pageVariableName || pageWithoutLoadExport) return code

  // Get the new code after intercepting the export
  code = pagePkg.getCode()

  if (isClientCode && !isPage) return templateAppDirClientComponent({ code, hash, pageVariableName })
  if (isClientCode && isPage) return templateAppDirClientPage({ code, hash, pageVariableName, pathname, hasLoadLocaleFrom })

  return `
    ${code}
  
    export default async function __Next_Load_new__${hash}__(props) {
      globalThis.__NEXT_LOAD__ = 'todo'
      return <${pageVariableName} {...props} />
    }
`
}

type ClientTemplateParams = { code: string, hash: string, pageVariableName: string, pathname?: string, hasLoadLocaleFrom?: boolean }

function templateAppDirClientComponent({ code, hash, pageVariableName }: ClientTemplateParams) {
  let clientCode = code
  const topLine = clientLine[0]

  // Clear current "use client" top line
  clientLine.forEach(line => { clientCode = clientCode.replace(line, '') })

  return `${topLine}
    import * as __react from 'react'

    ${clientCode}

    export default function __Next_Load_new__${hash}__(props) {
      const forceUpdate = __react.useReducer(() => [])[1]
      const isClient = typeof window !== 'undefined'

      if (isClient && !('__NEXT_LOAD__' in window)) {
        window.__NEXT_LOAD__ = undefined
        window.__NEXT_TO_LOAD__ = true
        update()
      }

      __react.useEffect(update)
      function update() {
        const el = document.getElementById('__NEXT_LOAD_DATA__')
        if (!el) return
        const { data } = el.dataset
        window.__NEXT_LOAD__ = data
        if (window.__NEXT_TO_LOAD__) {
          forceUpdate()
          delete window.__NEXT_TO_LOAD__
        }
      }

      return <${pageVariableName} {...props} />
    }
  `
}

function templateAppDirClientPage({ code, hash, pageVariableName, pathname, hasLoadLocaleFrom }: ClientTemplateParams) {
  let clientCode = code
  const topLine = clientLine[0]

  // Clear current "use client" top line
  clientLine.forEach(line => { clientCode = clientCode.replace(line, '') })

  return `${topLine}
    import { useSearchParams as __useSearchParams } from 'next/navigation'
    import * as __react from 'react'

    ${clientCode}

    export default function __Next_Load_new__${hash}__(props) {
      console.log('todo templateAppDirClientPage')
      return <${pageVariableName} {...props} />
    }
  `
}
