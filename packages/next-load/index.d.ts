declare global {
    namespace globalThis {
        var __NEXT_LOAD__: any;
    }
}
export declare function consume<T>(): T;
export declare function _useHydrate(): void;
export default consume;
