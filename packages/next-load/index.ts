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

export default consume