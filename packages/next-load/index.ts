export function consume<T>(): T {
  if (!('__NEXT_LOAD__' in globalThis)) {
    console.warn('next-load: Did you forget to add the next-load-plugin?');
  }
  return globalThis.__NEXT_LOAD__ as T;
}

export default consume