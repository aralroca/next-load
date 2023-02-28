import React from 'react'
import transformer from '../src/transformer'
import { colorOrange, colorRed, parseCode } from '../src/utils'
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { render, screen } from '@testing-library/react';
import ts from "typescript";

declare global {
  namespace globalThis {
    var __NEXT_LOAD__: any
  }
}

const insideAppDir = {
  normalizedResourcePath: '/Users/username/Projects/nextjs-blog/app/page.js',
  normalizedPagesPath: '/Users/username/Projects/nextjs-blog/app',
}

const outsideAppDir = {
  normalizedResourcePath: '/Users/username/Projects/nextjs-blog/page.js',
  normalizedPagesPath: '/Users/username/Projects/nextjs-blog/app',
}

const moreHydrateInfo = 'For more information, please refer to the documentation provided at https://github.com/aralroca/next-load#hydrate.'

const log = console.log
const mockLog = jest.spyOn(console, 'log').mockImplementation((args) => { log(args) });

jest.mock('@next-load-root/next.load', () => ({ __esModule: true, default: {} }), { virtual: true })

describe('transformer', () => {
  describe('WITHOUT load export', () => {
    beforeEach(() => {
      globalThis.__NEXT_LOAD__ = undefined
      jest.clearAllMocks();
    })

    it('SHOULD NOT transform the SERVER /page', () => {
      const pagePkg = parseCode('jsx', `
       export default function Page() { return <div>Page</div>; }
      `)
      const code = pagePkg.getCode()
      const options = { pageNoExt: '/page', ...insideAppDir }
      const output = transformer(pagePkg, options)
      expect(output).toBe(code)
    });

    it('SHOULD NOT transform the CLIENT /page', () => {
      const pagePkg = parseCode('jsx', `
        "use client"; 
        
        export default function Page() { return <div>Page</div>; }
      `)
      const code = pagePkg.getCode()
      const options = { pageNoExt: '/page', ...insideAppDir }
      const output = transformer(pagePkg, options)
      expect(output).toBe(code)
    });

    it('SHOULD NOT transform the SERVER /component', () => {
      const pagePkg = parseCode('jsx', `        
        export default function Page() { return <div>Page</div>; }
      `)
      const code = pagePkg.getCode()
      const options = { pageNoExt: '/component', ...insideAppDir }
      const output = transformer(pagePkg, options)
      expect(output).toBe(code)
    });

    it('SHOULD NOT transform the HELPER /page and consume should work', async () => {
      globalThis.__NEXT_LOAD__ = { hydrate: ['next-load'] }
      const pagePkg = parseCode('jsx', `
        import { consume } from 'next-load';
        export default function helper() { return new Set(consume()); }
      `)
      const code = pagePkg.getCode()
      const options = { pageNoExt: '/utils/helper', ...outsideAppDir }
      const output = transformer(pagePkg, options)
      const helper = await importFromString(output).then(m => m.default)
      expect(output).toBe(code)
      expect(helper().has('next-load')).toBeTruthy()
    });

    it('SHOULD transfrom a CLIENT /component to hydrate if needs', async () => {
      const element = document.createElement('div')
      element.dataset.hydrate = JSON.stringify({ data: { text: 'HYDRATE WORKS' } })
      document.getElementById = jest.fn().mockReturnValue(element)
      const pagePkg = parseCode('jsx', `
        "use client";
        import React from 'react';
        import { consume } from 'next-load';
        
        export default function Component() {
          const {data} = consume<string>(); 
          return <h1 data-testid="test">RESULT: {data.text}</h1> 
        }
      `)
      const options = { pageNoExt: '/component', ...insideAppDir }
      const output = transformer(pagePkg, options)
      const Component = await importFromString(output).then(m => m.default)
      render(<Component />)
      const div = screen.getByTestId('test')
      expect(div.textContent).toBe('RESULT: HYDRATE WORKS')
    });
  })

  describe('WITH load export', () => {
    beforeEach(() => {
      globalThis.__NEXT_LOAD__ = undefined
      jest.clearAllMocks();
    })

    it('SHOULD be possible to load this data inside a SERVER /page', async () => {
      await applyConfig({
        data: {
          pages: ['/'],
          load: async () => ({ text: 'LOAD WORKS' })
        },
      })

      const pagePkg = parseCode('jsx', `
        import React from 'react';
        import { consume } from 'next-load';

        type DataType = { text: string };

        export default function Page() {
          const { data } = consume<DataType>();
          return <div data-testid="test">Page: {data.text}</div>; 
        }
      `)
      const options = { pageNoExt: '/page', loaders: ['/'], ...insideAppDir }
      const output = transformer(pagePkg, options)
      const page = await importFromString(output).then(m => m.default)
      render(<>{await page()}</>)
      const div = screen.getByTestId('test')
      expect(div.textContent).toBe('Page: LOAD WORKS')
    })
    it('SHOULD receive the page props as params to load better the data in a SERVER /page', async () => {
      await applyConfig({
        data: {
          pages: ['/'],
          load: async ({ pageProps }: any) => ({ text: 'LOAD WORKS IN ' + pageProps.text.toUpperCase() })
        }
      })

      const pagePkg = parseCode('jsx', `
        import React from 'react';
        import { consume } from 'next-load';

        type DataType = { text: string };

        export default function Page(props) {
          const { data } = consume<DataType>();
          return <div data-testid="test-id">{props.text}: {data.text}</div>; 
        }
      `)
      const options = { pageNoExt: '/page', loaders: ['/'], ...insideAppDir }
      const output = transformer(pagePkg, options)
      const page = await importFromString(output).then(m => m.default)
      render(<>{await page({ text: 'Page' })}</>)
      const div = screen.getByTestId('test-id')
      expect(div.textContent).toBe('Page: LOAD WORKS IN PAGE')
    })
    it('SHOULD receive the page name as second argument to load better the data in a SERVER /page', async () => {
      const mockLoad = jest.fn()
      await applyConfig({
        data: {
          pages: ['/about'],
          load: async ({ pageProps }: any, pathname: string) => {
            mockLoad(pageProps, pathname)
            return { text: `LOAD WORKS IN ${pathname}` }
          },
        }
      })

      const pagePkg = parseCode('jsx', `
        import React from 'react';
        import { consume } from 'next-load';

        export default function Page(pageProps) {
          const { data } = consume();
          return <div data-testid="test-id">{data.text}</div>;
        }
      `)
      const options = { pageNoExt: '/about/page', loaders: ['/about'], ...insideAppDir }
      const output = transformer(pagePkg, options)
      const page = await importFromString(output).then(m => m.default)
      render(<>{await page({})}</>)
      const div = screen.getByTestId('test-id')
      expect(div.textContent).toBe('LOAD WORKS IN /about')
      expect(mockLoad).toBeCalledWith({}, '/about')
    })
    it('SHOULD transform the SERVER /page adding element to hydrate to clients', async () => {
      await applyConfig({
        data: {
          pages: ['/'],
          load: async () => ({ text: 'LOAD WORKS' })
        }
      })
      const pagePkg = parseCode('jsx', `
        import React from 'react';

        export default function Page() { return <div>Page</div>; }
      `)
      const options = { pageNoExt: '/page', loaders: ['/'], ...insideAppDir }
      const output = transformer(pagePkg, options)
      const page = await importFromString(output).then(m => m.default)
      render(<>{await page()}</>)
      const hydrateElement = screen.getByTestId('__NEXT_LOAD_DATA__')
      expect(hydrateElement.dataset.page).toBe('/')
      expect(hydrateElement.dataset.hydrate).toBe('{\"data\":{\"text\":\"LOAD WORKS\"}}')
    })
    it('SHOULD also work the "load" without promise in the SERVER /page', async () => {
      await applyConfig({
        data: {
          pages: ['/'],
          load: async () => ({ text: 'LOAD WORKS' })
        }
      })
      const pagePkg = parseCode('jsx', `
        import React from 'react';

        export default function Page() { return <div>Page</div>; }
      `)
      const options = { pageNoExt: '/page', loaders: ['/'], ...insideAppDir }
      const output = transformer(pagePkg, options)
      const page = await importFromString(output).then(m => m.default)
      render(<>{await page()}</>)
      const hydrateElement = screen.getByTestId('__NEXT_LOAD_DATA__')
      expect(hydrateElement.dataset.page).toBe('/')
      expect(hydrateElement.dataset.hydrate).toBe('{\"data\":{\"text\":\"LOAD WORKS\"}}')
    })
    it('SHOULD be possible to hydrate a big array of data in SERVER /page', async () => {
      const bigDataSize = Array.from({ length: 1000 }).map((_, i) => i)
      await applyConfig({
        data: {
          pages: [new RegExp('/product.*')],
          load: () => bigDataSize
        }
      })

      const pagePkg = parseCode('jsx', `
        import React from 'react';
        export default function Page() { return <div>Page</div>; }
      `)
      const options = { pageNoExt: '/product/[id]/page', loaders: [new RegExp('/product.*')], ...insideAppDir }
      const output = transformer(pagePkg, options)
      const page = await importFromString(output).then(m => m.default)
      render(<>{await page()}</>)
      const hydrateElement = screen.getByTestId('__NEXT_LOAD_DATA__')
      expect(hydrateElement.dataset.page).toBe('/product/[id]')
      expect(JSON.parse(hydrateElement.dataset.hydrate!).data).toHaveLength(1000)
    })
    it('SHOULD be possible to load this data inside a CLIENT /page', async () => {
      await applyConfig({
        data: {
          pages: ['/'],
          load: async () => ({ text: 'LOAD WORKS' })
        }
      })
      const pagePkg = parseCode('jsx', `
        "use client";
        import React from 'react';
        import { consume } from 'next-load';

        type DataType = { data: { text: string } };

        export default function Page() {
          const { data } = consume<DataType>();
          return <div data-testid="test">Client page: {data.text}</div>; 
        }
      `)
      const options = { pageNoExt: '/page', loaders: ['/'], ...insideAppDir }
      const output = transformer(pagePkg, options)
      const ClientPage = await importFromString(output).then(m => m.default)
      render(<ClientPage />);
      const div = await screen.findByTestId('test')
      expect(div.textContent).toBe('Client page: LOAD WORKS')
    })

    it('SHOULD also work the "load" without promise in the CLIENT /page', async () => {
      await applyConfig({
        data: {
          pages: ['/'],
          load: async () => ({ text: 'LOAD WORKS' })
        }
      })
      const pagePkg = parseCode('jsx', `
        "use client";
        import React from 'react';
        import { consume } from 'next-load';

        type DataType = { data: text: string } };

        export default function Page() {
          const { data } = consume<DataType>();
          return <div data-testid="test">Client page: {data.text}</div>; 
        }
      `)
      const options = { pageNoExt: '/page', loaders: ['/'], ...insideAppDir }
      const output = transformer(pagePkg, options)
      const ClientPage = await importFromString(output).then(m => m.default)
      render(<ClientPage />);
      const div = await screen.findByTestId('test')
      expect(div.textContent).toBe('Client page: LOAD WORKS')
    })
    it('SHOULD receive the page name as second argument to load better the data in a CLIENT /page', async () => {
      const mockLoad = jest.fn()
      await applyConfig({
        data: {
          pages: ['/about'],
          load: async ({ pageProps }: any, pathname: string) => {
            mockLoad(pageProps, pathname)
            return { text: `LOAD WORKS IN ${pathname}` }
          },
        }
      })

      const pagePkg = parseCode('jsx', `
        "use client";
        import React from 'react';
        import { consume } from 'next-load';

        export default function Page(pageProps) {
          const { data } = consume();
          return <div data-testid="test-id">{data.text}</div>;
        }
      `)
      const options = { pageNoExt: '/about/page', loaders: ['/about'], ...insideAppDir }
      const output = transformer(pagePkg, options)
      const Component = await importFromString(output).then(m => m.default)
      render(<Component />)
      const div = await screen.findByTestId('test-id')
      expect(div.textContent).toBe('LOAD WORKS IN /about')
      expect(mockLoad).toBeCalledWith({}, '/about')
    })
    it('SHOULD receive the page props as params to load better the data in a CLIENT /page', async () => {
      await applyConfig({
        data: {
          pages: ['/'],
          load: async ({ pageProps }: any) => ({ text: 'LOAD WORKS IN ' + pageProps.text.toUpperCase() })
        }
      })
      const pagePkg = parseCode('jsx', `
        "use client";
        import React from 'react';
        import { consume } from 'next-load';

        type DataType = { data: { text: string } };

        export default function Page(pageProps) {
          const { data } = consume<DataType>();
          return <div data-testid="test">{pageProps.text}: {data.text}</div>; 
        }
      `)
      const options = { pageNoExt: '/page', loaders: ['/'], ...insideAppDir }
      const output = transformer(pagePkg, options)
      const ClientPage = await importFromString(output).then(m => m.default)
      render(<ClientPage text="Client Page" />)
      const div = await screen.findByTestId('test')
      expect(div.textContent).toBe('Client Page: LOAD WORKS IN CLIENT PAGE')
    })
    it('SHOULD NOT add an element to hydrate to clients in a CLIENT page', async () => {
      await applyConfig({
        data: {
          pages: ['/'],
          load: async () => ({ text: 'LOAD WORKS' })
        }
      })
      const pagePkg = parseCode('jsx', `
        "use client";
        import React from 'react';
        import { consume } from 'next-load';

        export default function Page() { 
          const { data } = consume<DataType>();
          return <div data-testid="test">Client page: {data.text}</div>; 
        }
      `)
      const options = { pageNoExt: '/page', loaders: ['/'], ...insideAppDir }
      const output = transformer(pagePkg, options)
      const ClientPage = await importFromString(output).then(m => m.default)
      render(<ClientPage />)
      const div = await screen.findByTestId('test')
      expect(div.textContent).toBe('Client page: LOAD WORKS')
      const hydrateElement = screen.queryByTestId('__NEXT_LOAD_DATA__')
      expect(hydrateElement).toBe(null)
    })
    it('SHOULD NOT transform the SERVER /component', async () => {
      await applyConfig({
        data: {
          pages: ['/'],
          load: async () => ({ text: 'LOAD WORKS' })
        }
      })
      const pagePkg = parseCode('jsx', `
        export default function Page() { return <div>Page</div>; }
      `)
      const code = pagePkg.getCode()
      const options = { pageNoExt: '/component', loaders: ['/'], ...insideAppDir }
      const output = transformer(pagePkg, options)
      expect(output).toBe(code)
    });
    it('SHOULD transform the CLIENT /component to hydrate but not use the load', async () => {
      await applyConfig({
        data: {
          pages: ['/'],
          load: async () => ({ text: 'SHOULD NOT BE USED' }),
        }
      })
      const element = document.createElement('div')
      element.dataset.hydrate = JSON.stringify({ data: { text: "HYDRATE WORKS" } })
      document.getElementById = jest.fn().mockReturnValue(element)
      const pagePkg = parseCode('jsx', `
          "use client";
          import React from 'react';
          import { consume } from 'next-load';
          
          export default function Component() {
            const { data } = consume(); 
            return <h1 data-testid="test">RESULT: {data?.text}</h1> 
          }
        `)
      const options = { pageNoExt: '/component', loaders: ['/'], ...insideAppDir }
      const output = transformer(pagePkg, options)
      const Component = await importFromString(output).then(m => m.default)
      render(<Component />)
      const div = screen.getByTestId('test')
      expect(div.textContent).toBe('RESULT: HYDRATE WORKS')
    });
    it('SHOULD transform the CLIENT /component to hydrate but not use the load in outside app dir components', async () => {
      await applyConfig({
        data: {
          pages: ['/some/component'],
          load: async () => ({ text: 'SHOULD NOT BE USED' }),
        }
      })
      const element = document.createElement('div')
      element.dataset.page = '/some/component'
      element.dataset.hydrate = JSON.stringify({ data: { text: 'HYDRATE WORKS' } })
      document.getElementById = jest.fn().mockReturnValue(element)
      const pagePkg = parseCode('jsx', `
          "use client";
          import React from 'react';
          import { consume } from 'next-load';
          
          export default function Component() {
            const {data} = consume(); 
            return <h1 data-testid="test">RESULT: {data.text}</h1> 
          }
        `)
      const options = { pageNoExt: '/some/component', loaders: ['/some/component'], ...outsideAppDir }
      const output = transformer(pagePkg, options)
      const Component = await importFromString(output).then(m => m.default)
      render(<Component />)
      const div = screen.getByTestId('test')
      expect(div.textContent).toBe('RESULT: HYDRATE WORKS')
    });
  });

  describe('WITH hydrate export', () => {
    beforeEach(() => {
      globalThis.__NEXT_LOAD__ = undefined
      jest.clearAllMocks();
    })

    it('SHOULD NOT be possible to use hydrate without load in a SERVER /page', async () => {
      await applyConfig({
        data: {
          pages: ['/'],
          hydrate: async () => ({ text: 'HYDRATE WORKS' })
        }
      })
      const pagePkg = parseCode('jsx', `
        import React from 'react';
        import { consume } from 'next-load';

        type DataType = { text: string };

        export const hydrate = async () => ({ text: 'HYDRATE WORKS' });

        export default function Page() {
          const { text } = consume<DataType>();
          return <div data-testid="test">Page: {text}</div>; 
        }
      `)
      const code = pagePkg.getCode()
      const options = { pageNoExt: '/page', hydraters: ['/'], ...insideAppDir }
      const output = transformer(pagePkg, options)
      expect(output).toBe(code)
      const prefix = colorRed('[next-load] ERROR ')
      const message = colorOrange(`The function "hydrate export" can only be accessed through the use of "load export". ${moreHydrateInfo}`)
      expect(mockLog).toHaveBeenCalledWith(prefix, message)
    });
    it('SHOULD NOT be possible to use hydrate with load in a CLIENT /page', async () => {
      await applyConfig({
        data: {
          pages: ['/'],
          load: async () => ({ text: 'LOAD WORKS' }),
          hydrate: async () => ({ text: 'HYDRATE WORKS' })
        }
      })
      const pagePkg = parseCode('jsx', `
        "use client";
        import React from 'react';
        import { consume } from 'next-load';

        type DataType = { data: { text: string } };

        export default function Page() {
          const { data } = consume<DataType>();
          return <div data-testid="test">Page: {data.text}</div>; 
        }
      `)
      const options = { pageNoExt: '/page', loaders: ['/'], hydraters: ['/'], ...insideAppDir }
      const output = transformer(pagePkg, options)
      const Component = await importFromString(output).then(m => m.default)
      render(<Component />)
      const div = await screen.findByTestId('test')
      expect(div.textContent).toBe('Page: LOAD WORKS')
      const prefix = colorRed('[next-load] ERROR ')
      const message = colorOrange(`The "hydrate export" function is exclusively accessible within a server page. To achieve similar functionality, utilize the "load export" function. ${moreHydrateInfo}`)
      expect(mockLog).toHaveBeenCalledWith(prefix, message)
    });
    it('SHOULD be possible to load data inside a SERVER /page and hydrate the hydrate data', async () => {
      await applyConfig({
        data: {
          pages: ['/'],
          load: async () => ({ text: 'LOAD WORKS' }),
          hydrate: async () => ({ text: 'HYDRATE WORKS' })
        }
      })
      const pagePkg = parseCode('jsx', `
        import React from 'react';
        import { consume } from 'next-load';

        type DataType = { data: { text: string } };

        export default function Page() {
          const { data } = consume<DataType>();
          return <div data-testid="test">Page: {data.text}</div>; 
        }
      `)
      const options = { pageNoExt: '/page', loaders: ['/'], hydraters: ['/'], ...insideAppDir }
      const output = transformer(pagePkg, options)
      const page = await importFromString(output).then(m => m.default)
      render(<>{await page()}</>)
      const div = screen.getByTestId('test')
      expect(div.textContent).toBe('Page: LOAD WORKS')
      const hydrateElement = screen.getByTestId('__NEXT_LOAD_DATA__')
      expect(hydrateElement.dataset.page).toBe('/')
      expect(hydrateElement.dataset.hydrate).toBe('{\"data\":{\"text\":\"HYDRATE WORKS\"}}')
    })
    it('SHOULD receive the page name as second argument to load & hydrate method in a SERVER /page', async () => {
      const mockLoad = jest.fn()
      const mockHydrate = jest.fn()
      await applyConfig({
        data: {
          pages: ['/about'],
          load: async ({ pageProps }: any, pathname: string) => {
            mockLoad(pageProps, pathname)
            return { text: `LOAD WORKS IN ${pathname}` }
          },
          hydrate: async (data: any, pathname: string) => {
            mockHydrate(data, pathname)
            return { text: `HYDRATE WORKS IN ${pathname}` }
          }
        }
      })

      const pagePkg = parseCode('jsx', `
        import React from 'react';
        import { consume } from 'next-load';

        export default function Page(pageProps) {
          const { data } = consume();
          return <div data-testid="test-id">{data.text}</div>;
        }
      `)
      const options = { pageNoExt: '/about/page', loaders: ['/about'], hydraters: ['/about'], ...insideAppDir }
      const output = transformer(pagePkg, options)
      const page = await importFromString(output).then(m => m.default)
      render(<>{await page({})}</>)
      const div = screen.getByTestId('test-id')
      expect(div.textContent).toBe('LOAD WORKS IN /about')
      expect(mockLoad).toBeCalledWith({}, '/about')
      expect(mockHydrate).toBeCalledWith({ text: 'LOAD WORKS IN /about' }, '/about')
      const hydrateElement = screen.getByTestId('__NEXT_LOAD_DATA__')
      expect(hydrateElement.dataset.page).toBe('/about')
      expect(hydrateElement.dataset.hydrate).toBe('{\"data\":{\"text\":\"HYDRATE WORKS IN /about\"}}')
    })
  });
});

async function applyConfig(config: any = {}) {
  // @ts-ignore
  const module = await import('@next-load-root/next.load')
  module.default = config
}

async function importFromString(code: string): Promise<any> {
  const tempFile = join(tmpdir(), `toremove-${Date.now()}.tsx`);
  const transpiledCode = ts.transpileModule(code.replace(new RegExp("'react'", 'gm'), "'@react'"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true
    }
  }).outputText;
  await fs.writeFile(tempFile, '// @ts-nocheck\n' + transpiledCode);
  const module = await import(tempFile).catch(e => console.error(e));
  await fs.unlink(tempFile);
  return module;
}
