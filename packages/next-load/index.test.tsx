import React from 'react'
import { consume, _useHydrate } from "./index";
import { render, screen } from "@testing-library/react";

describe("next-load", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("consume", () => {
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

  describe("_useHydrate", () => {
    it("should work", async () => {
      const Parent = ({ children }: { children: React.ReactNode }) => {
        return <div id="__NEXT_LOAD_DATA__" data-hydrate="next-load" data-page="/test">{children}</div>
      };

      const Component = () => {
        _useHydrate();
        return <>{'RESULT: ' + window.__NEXT_LOAD__.hydrate}</>;
      };

      render(<Parent><Component /></Parent>)

      const text = await screen.findByText("RESULT: next-load");

      expect(text.id).toEqual('__NEXT_LOAD_DATA__');
    });
  });
});
