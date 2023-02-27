import { useReducer, useEffect } from 'react'

declare global {
  namespace globalThis {
    var __NEXT_LOAD__: any
  }
}

export function consume<T>(): T {
  if (!('__NEXT_LOAD__' in globalThis)) {
    console.warn('next-load: Did you forget to add the next-load-plugin?');
  }
  return globalThis.__NEXT_LOAD__?.hydrate as T;
}

export function _useHydrate() {
  // @ts-expect-error - useReducer as forceRender without rest of args
  const forceUpdate = useReducer(() => [])[1]
  const isClient = typeof window !== 'undefined'

  if (isClient && !window.__NEXT_LOAD__) {
    window.__NEXT_LOAD__ = {}
    update(false)
  }

  useEffect(update)
  function update(rerender = true) {
    const el = document.getElementById('__NEXT_LOAD_DATA__')
    if (!el) return
    const { hydrate, page } = el.dataset
    const shouldRerender = page !== window.__NEXT_LOAD__.page
    window.__NEXT_LOAD__ = { hydrate, page }
    if (shouldRerender && rerender) forceUpdate()
  }
}

export async function __nl_load(props: any, page: string, config: any) {
  const keys = Object.keys(config)

  const data = await Promise.all(keys.map(key => {
    const item = config[key]
    if (isPageOfTheList(page, item.pages) && typeof item.load === 'function') {
      return item.load(props)
    }
  }))

  return data.reduce((acc, item, index) => {
    if (item) acc[keys[index]] = item
    return acc
  }, {})
}

export async function __nl_hydrate(props: any, page: string, config: any) {
  const keys = Object.keys(props)

  const data = await Promise.all(keys.map(key => {
    const item = config[key]
    const toHydrate = isPageOfTheList(page, item.pages) && typeof item.hydrate === 'function'
    return toHydrate ? item.hydrate(props[key]) : props[key]
  }))

  return data.reduce((acc, item, index) => {
    if (item) acc[keys[index]] = item
    return acc
  }, {})
}

function isPageOfTheList(page: string, list: (string | RegExp)[] = []) {
  return list.some((item) => {
    if (typeof item === 'string') return item === page
    return item.test(page)
  })
}
