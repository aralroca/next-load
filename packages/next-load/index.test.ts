import { consume } from "./index";

describe("next-load", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should work", () => {
    console.warn = jest.fn();
    globalThis.__NEXT_LOAD__ = { hydrate: "next-load" };
    expect(consume()).toEqual("next-load");
    globalThis.__NEXT_LOAD__ = { hydrate: undefined };
    expect(consume()).toEqual(undefined);
    globalThis.__NEXT_LOAD__ = { hydrate: 4 };
    expect(consume()).toEqual(4);
    globalThis.__NEXT_LOAD__ = { hydrate: { test: true } };
    expect(consume()).toEqual({ test: true });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("should console.warn if __NEXT_LOAD__ doesn't exist ", () => {
    delete globalThis.__NEXT_LOAD__
    console.warn = jest.fn();
    expect(consume()).toEqual(undefined);
    expect(console.warn).toBeCalledTimes(1);
    expect(console.warn).toBeCalledWith('next-load: Did you forget to add the next-load-plugin?')
  });
});
