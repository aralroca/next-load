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

describe('transformer', () => {
  beforeEach(() => {
    globalThis.__NEXT_LOAD__ = undefined
    jest.clearAllMocks();
  })

  describe('WITHOUT load export', () => {
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
      element.dataset.hydrate = 'HYDRATE WORKS'
      document.getElementById = jest.fn().mockReturnValue(element)
      const pagePkg = parseCode('jsx', `
        "use client";
        import React from 'react';
        import { consume } from 'next-load';
        
        export default function Component() {
          const text = consume<string>(); 
          return <h1 data-testid="test">RESULT: {text}</h1> 
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
    it('SHOULD be possible to load this data inside a SERVER /page', async () => {
      jest.mock('@next-load-root/next.load', () => ({
        load: async () => ({ text: 'LOAD WORKS' })
      }), { virtual: true })

      const pagePkg = parseCode('jsx', `
        import React from 'react';
        import { consume } from 'next-load';

        type DataType = { text: string };

        export default function Page() {
          const { text } = consume<DataType>();
          return <div data-testid="test">Page: {text}</div>; 
        }
      `)
      const options = { pageNoExt: '/page', loaders: ['/page'], ...insideAppDir }
      const output = transformer(pagePkg, options)
      const page = await importFromString(output).then(m => m.default)
      render(<>{await page()}</>)
      const div = screen.getByTestId('test')
      expect(div.textContent).toBe('Page: LOAD WORKS')
    })
    it('SHOULD receive the page props as params to load better the data in a SERVER /page', async () => {
      jest.mock('@next-load-root/next.load', () => ({
        load: async (pageProps: any) => ({ text: 'LOAD WORKS In ' + pageProps.text.toUpperCase() })
      }), { virtual: true })

      const pagePkg = parseCode('jsx', `
        import React from 'react';
        import { consume } from 'next-load';

        type DataType = { text: string };

        export default function Page(pageProps) {
          const { text } = consume<DataType>();
          return <div data-testid="test">{pageProps.text}: {text}</div>; 
        }
      `)
      const options = { pageNoExt: '/page', ...insideAppDir }
      const output = transformer(pagePkg, options)
      const page = await importFromString(output).then(m => m.default)
      render(<>{await page({ text: 'Page' })}</>)
      const div = screen.getByTestId('test')
      expect(div.textContent).toBe('Page: LOAD WORKS IN PAGE')
    })
    it('SHOULD transform the SERVER /page adding element to hydrate to clients', async () => {
      jest.mock('@next-load-root/next.load', () => ({
        load: async () => ({ text: 'LOAD WORKS' })
      }), { virtual: true })
      const pagePkg = parseCode('jsx', `
        import React from 'react';

        export default function Page() { return <div>Page</div>; }
      `)
      const options = { pageNoExt: '/page', ...insideAppDir }
      const output = transformer(pagePkg, options)
      const page = await importFromString(output).then(m => m.default)
      render(<>{await page()}</>)
      const hydrateElement = screen.getByTestId('__NEXT_LOAD_DATA__')
      expect(hydrateElement.dataset.page).toBe('/')
      expect(hydrateElement.dataset.hydrate).toBe('{\"text\":\"LOAD WORKS\"}')
    })
    it('SHOULD also work the "load" without promise in the SERVER /page', async () => {
      jest.mock('@next-load-root/next.load', () => ({
        load: async () => ({ text: 'LOAD WORKS' })
      }), { virtual: true })
      const pagePkg = parseCode('jsx', `
        import React from 'react';

        export default function Page() { return <div>Page</div>; }
      `)
      const options = { pageNoExt: '/page', ...insideAppDir }
      const output = transformer(pagePkg, options)
      const page = await importFromString(output).then(m => m.default)
      render(<>{await page()}</>)
      const hydrateElement = screen.getByTestId('__NEXT_LOAD_DATA__')
      expect(hydrateElement.dataset.page).toBe('/')
      expect(hydrateElement.dataset.hydrate).toBe('{\"text\":\"LOAD WORKS\"}')
    })
    it('SHOULD be possible to hydrate a big array of data in SERVER /page', async () => {
      // ~589kb
      jest.mock('@next-load-root/next.load', () => {
        const bigDataSize = JSON.stringify(Array.from({ length: 100000 }).map((_, i) => i))
        return { load: () => bigDataSize }
      }, { virtual: true })
      const pagePkg = parseCode('jsx', `
        import React from 'react';
        export default function Page() { return <div>Page</div>; }
      `)
      const options = { pageNoExt: '/product/[id]/page', ...insideAppDir }
      const output = transformer(pagePkg, options)
      const page = await importFromString(output).then(m => m.default)
      render(<>{await page()}</>)
      const hydrateElement = screen.getByTestId('__NEXT_LOAD_DATA__')
      expect(hydrateElement.dataset.page).toBe('/product/[id]')
      expect(JSON.parse(hydrateElement.dataset.hydrate!)).toHaveLength(100000)
    })
    it('SHOULD be possible to load this data inside a CLIENT /page', async () => {
      jest.mock('@next-load-root/next.load', () => ({
        load: async (pageProps: any) => ({ text: 'LOAD WORKS In ' + pageProps.text.toUpperCase() })
      }), { virtual: true })
      const pagePkg = parseCode('jsx', `
        "use client";
        import React from 'react';
        import { consume } from 'next-load';

        type DataType = { text: string };

        export default function Page() {
          const { text } = consume<DataType>();
          return <div data-testid="test">Client page: {text}</div>; 
        }
      `)
      const options = { pageNoExt: '/page', ...insideAppDir }
      const output = transformer(pagePkg, options)
      const ClientPage = await importFromString(output).then(m => m.default)
      render(<ClientPage />);
      const div = await screen.findByTestId('test')
      expect(div.textContent).toBe('Client page: LOAD WORKS')
    })

    it('SHOULD also work the "load" without promise in the CLIENT /page', async () => {
      jest.mock('@next-load-root/next.load', () => ({
        load: async () => ({ text: 'LOAD WORKS' })
      }), { virtual: true })
      const pagePkg = parseCode('jsx', `
        "use client";
        import React from 'react';
        import { consume } from 'next-load';

        type DataType = { text: string };

        export default function Page() {
          const { text } = consume<DataType>();
          return <div data-testid="test">Client page: {text}</div>; 
        }
      `)
      const options = { pageNoExt: '/page', ...insideAppDir }
      const output = transformer(pagePkg, options)
      const ClientPage = await importFromString(output).then(m => m.default)
      render(<ClientPage />);
      const div = await screen.findByTestId('test')
      expect(div.textContent).toBe('Client page: LOAD WORKS')
    })
    it('SHOULD receive the page props as params to load better the data in a CLIENT /page', async () => {
      jest.mock('@next-load-root/next.load', () => ({
        load: async (pageProps: any) => ({ text: 'LOAD WORKS IN' + pageProps.text.toUpperCase() })
      }), { virtual: true })
      const pagePkg = parseCode('jsx', `
        "use client";
        import React from 'react';
        import { consume } from 'next-load';

        type DataType = { text: string };

        export default function Page(pageProps) {
          const { text } = consume<DataType>();
          return <div data-testid="test">{pageProps.text}: {text}</div>; 
        }
      `)
      const options = { pageNoExt: '/page', ...insideAppDir }
      const output = transformer(pagePkg, options)
      const ClientPage = await importFromString(output).then(m => m.default)
      render(<ClientPage text="Client Page" />)
      const div = await screen.findByTestId('test')
      expect(div.textContent).toBe('Client Page: LOAD WORKS IN CLIENT PAGE')
    })
    it('SHOULD NOT add an element to hydrate to clients in a CLIENT page', async () => {
      jest.mock('@next-load-root/next.load', () => ({
        load: async () => ({ text: 'LOAD WORKS' })
      }), { virtual: true })
      const pagePkg = parseCode('jsx', `
        "use client";
        import React from 'react';
        import { consume } from 'next-load';

        export default function Page() { 
          const { text } = consume<DataType>();
          return <div data-testid="test">Client page: {text}</div>; 
        }
      `)
      const options = { pageNoExt: '/page', ...insideAppDir }
      const output = transformer(pagePkg, options)
      const ClientPage = await importFromString(output).then(m => m.default)
      render(<ClientPage />)
      const div = await screen.findByTestId('test')
      expect(div.textContent).toBe('Client page: LOAD WORKS')
      const hydrateElement = screen.queryByTestId('__NEXT_LOAD_DATA__')
      expect(hydrateElement).toBe(null)
    })
    it('SHOULD NOT transform the SERVER /component', () => {
      jest.mock('@next-load-root/next.load', () => ({
        load: async () => ({ text: 'LOAD WORKS' })
      }), { virtual: true })
      const pagePkg = parseCode('jsx', `
        export default function Page() { return <div>Page</div>; }
      `)
      const code = pagePkg.getCode()
      const options = { pageNoExt: '/component', ...insideAppDir }
      const output = transformer(pagePkg, options)
      expect(output).toBe(code)
    });
    it('SHOULD transform the CLIENT /component to hydrate but not use the load', async () => {
      jest.mock('@next-load-root/next.load', () => ({
        load: async () => ({ text: 'SHOULD NOT BE USED' }),
      }), { virtual: true })
      const element = document.createElement('div')
      element.dataset.hydrate = 'HYDRATE WORKS'
      document.getElementById = jest.fn().mockReturnValue(element)
      const pagePkg = parseCode('jsx', `
          "use client";
          import React from 'react';
          import { consume } from 'next-load';
          
          export default function Component() {
            const text = consume<string>(); 
            return <h1 data-testid="test">RESULT: {text}</h1> 
          }
        `)
      const options = { pageNoExt: '/component', ...insideAppDir }
      const output = transformer(pagePkg, options)
      const Component = await importFromString(output).then(m => m.default)
      render(<Component />)
      const div = screen.getByTestId('test')
      expect(div.textContent).toBe('RESULT: HYDRATE WORKS')
    });
    it('SHOULD transform the CLIENT /component to hydrate but not use the load in outside app dir components', async () => {
      jest.mock('@next-load-root/next.load', () => ({
        load: async () => ({ text: 'SHOULD NOT BE USED' }),
      }), { virtual: true })
      const element = document.createElement('div')
      element.dataset.hydrate = 'HYDRATE WORKS'
      document.getElementById = jest.fn().mockReturnValue(element)
      const pagePkg = parseCode('jsx', `
          "use client";
          import React from 'react';
          import { consume } from 'next-load';
          
          export default function Component() {
            const text = consume<string>(); 
            return <h1 data-testid="test">RESULT: {text}</h1> 
          }
        `)
      const options = { pageNoExt: '/some/component', ...outsideAppDir }
      const output = transformer(pagePkg, options)
      const Component = await importFromString(output).then(m => m.default)
      render(<Component />)
      const div = screen.getByTestId('test')
      expect(div.textContent).toBe('RESULT: HYDRATE WORKS')
    });
  });

  describe('WITH hydrate export', () => {
    it('SHOULD NOT be possible to use hydrate without load in a SERVER /page', async () => {
      console.log = jest.fn()
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
      const options = { pageNoExt: '/page', ...insideAppDir }
      const output = transformer(pagePkg, options)
      expect(output).toBe(code)
      const prefix = colorRed('[next-load] ERROR ')
      const message = colorOrange(`The function "hydrate export" can only be accessed through the use of "load export". ${moreHydrateInfo}`)
      expect(console.log).toHaveBeenCalledWith(prefix, message)
    });
    it('SHOULD NOT be possible to use hydrate with load in a CLIENT /page', async () => {
      jest.mock('@next-load-root/next.load', () => ({
        load: async (pageProps: any) => ({ text: 'LOAD WORKS' }),
        hydrate: async () => ({ text: 'HYDRATE WORKS' })
      }), { virtual: true })
      console.log = jest.fn()
      const pagePkg = parseCode('jsx', `
        "use client";
        import React from 'react';
        import { consume } from 'next-load';

        type DataType = { text: string };

        export default function Page() {
          const { text } = consume<DataType>();
          return <div data-testid="test">Page: {text}</div>; 
        }
      `)
      const options = { pageNoExt: '/page', ...insideAppDir }
      const output = transformer(pagePkg, options)
      const Component = await importFromString(output).then(m => m.default)
      render(<Component />)
      const div = await screen.findByTestId('test')
      expect(div.textContent).toBe('Page: LOAD WORKS')
      const prefix = colorRed('[next-load] ERROR ')
      const message = colorOrange(`The "hydrate export" function is exclusively accessible within a server page. To achieve similar functionality, utilize the "load export" function. ${moreHydrateInfo}`)
      expect(console.log).toHaveBeenCalledWith(prefix, message)
    });
    it('SHOULD be possible to load data inside a SERVER /page and hydrate the hydrate data', async () => {
      jest.mock('@next-load-root/next.load', () => ({
        load: async (pageProps: any) => ({ text: 'LOAD WORKS' }),
        hydrate: async () => ({ text: 'HYDRATE WORKS' })
      }), { virtual: true })
      const pagePkg = parseCode('jsx', `
        import React from 'react';
        import { consume } from 'next-load';

        type DataType = { text: string };

        export default function Page() {
          const { text } = consume<DataType>();
          return <div data-testid="test">Page: {text}</div>; 
        }
      `)
      const options = { pageNoExt: '/page', ...insideAppDir }
      const output = transformer(pagePkg, options)
      const page = await importFromString(output).then(m => m.default)
      render(<>{await page()}</>)
      const div = screen.getByTestId('test')
      expect(div.textContent).toBe('Page: LOAD WORKS')
      const hydrateElement = screen.getByTestId('__NEXT_LOAD_DATA__')
      expect(hydrateElement.dataset.page).toBe('/')
      expect(hydrateElement.dataset.hydrate).toBe('{\"text\":\"HYDRATE WORKS\"}')
    })
  });
});

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
