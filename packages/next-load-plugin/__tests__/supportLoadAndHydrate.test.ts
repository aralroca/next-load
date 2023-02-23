import supportLoadAndHydrate from '../src/supportLoadAndHydrate'
import { parseCode } from '../src/utils'
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import ts from "typescript";

const insideAppDir = {
  normalizedResourcePath: '/Users/username/Projects/nextjs-blog/app/page.js',
  normalizedPagesPath: '/Users/username/Projects/nextjs-blog/app',
}

const outsideAppDir = {
  normalizedResourcePath: '/Users/username/Projects/nextjs-blog/page.js',
  normalizedPagesPath: '/Users/username/Projects/nextjs-blog/app',
}

describe('supportLoadAndHydrate', () => {
  describe('WITHOUT load export', () => {
    it('SHOULD NOT transform the SERVER /page', () => {
      const pagePkg = parseCode('jsx', `
       export default function Page() { return <div>Page</div>; }
      `)
      const code = pagePkg.getCode()
      const options = { pageNoExt: '/page', ...insideAppDir }
      const output = supportLoadAndHydrate(pagePkg, options)
      expect(output).toBe(code)
    });

    it('SHOULD NOT transform the CLIENT /page', () => {
      const pagePkg = parseCode('jsx', `
        "use client"; 
        
        export default function Page() { return <div>Page</div>; }
      `)
      const code = pagePkg.getCode()
      const options = { pageNoExt: '/page', ...insideAppDir }
      const output = supportLoadAndHydrate(pagePkg, options)
      expect(output).toBe(code)
    });

    it('SHOULD transfrom a CLIENT /component to hydrate if needs', async () => {
      const pagePkg = parseCode('jsx', `
        "use client";
        
        export default function Component() { return 'TODO'; }
      `)
      const options = { pageNoExt: '/component', ...insideAppDir }
      const output = supportLoadAndHydrate(pagePkg, options)
      const module = await importFromString(output)
      expect(module.default()).toBe('TODO')
    });
  })
});

async function importFromString(code: string): Promise<any> {
  const tempFile = join(tmpdir(), `toremove-${Date.now()}.js`);
  const transpiledCode = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  await fs.writeFile(tempFile, transpiledCode);
  const module = await import(tempFile).catch(e => console.error(e));
  await fs.unlink(tempFile);
  return module;
}
