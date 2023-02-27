import React from 'react'
import { consume, _useHydrate, __nl_load, __nl_hydrate } from "./index";
import { render, screen } from "@testing-library/react";

type User = {
  username: string;
  displayName?: string;
}

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

  describe("__nl_load", () => {
    it("should work", async () => {
      const config = {
        data: {
          pages: ['/about'],
          load: async () => 'works'
        },
        user: {
          pages: ['/about'],
          load: () => ({ username: 'Aral' })
        },
        empty: {},
        error: {
          pages: ['/error'],
          load: () => ({ error: '404' })
        }
      }
      const data = await __nl_load(undefined, '/about', config);
      expect(data).toEqual({ data: 'works', user: { username: 'Aral' } });
    });
  });

  describe("__nl_hydrate", () => {
    it("should work", async () => {
      const config = {
        data: {
          pages: ['/about'],
          load: async () => 'works'
        },
        user: {
          pages: ['/about'],
          load: () => ({ username: 'aralroca', displayName: 'Aral Roca' } as User),
          hydrate: (user: User) => ({ username: user.username.toUpperCase() })
        },
        empty: {},
        error: {
          pages: ['/error'],
          load: () => ({ error: '404' })
        }
      }
      const loadData = await __nl_load(undefined, '/about', config);
      const data = await __nl_hydrate(loadData, '/about', config);
      expect(data).toEqual({ data: 'works', user: { username: 'ARALROCA' } });
    });
  });
});
