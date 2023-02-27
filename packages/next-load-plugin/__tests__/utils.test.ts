import fs from 'fs'
import { getLoadersAndHydratorsLists } from "../src/utils";

describe('utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLoadersAndHydratorsLists', () => {
    it('should work with export default', async () => {
      const dir = '/path/to/directory';
      const code = `
        import some from 'some';

        export default {
          load: {
            '*': () => {},
            '/some/path': async () => 9,
          },
          hydrate: {
            '*': () => {},
            '/some/another/path': async () => [1, 2, 3],
          },
        }
      `;
      const tempFile = `${dir}/next.load.js` as any;
      jest.spyOn(fs, 'readdirSync').mockReturnValueOnce([tempFile]);
      jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(code);
      const { loaders, hydraters } = getLoadersAndHydratorsLists(dir);
      expect(loaders).toEqual(['*', '/some/path']);
      expect(hydraters).toEqual(['*', '/some/another/path']);
    });
    it('should work with module.exports', async () => {
      const dir = '/path/to/directory';
      const code = `
        module.exports = {
          load: {
            '*': () => {},
            '/some/path': async () => 9,
          },
          hydrate: {
            '*': () => {},
            '/some/another/path': async () => [1, 2, 3],
          },
        }
      `;
      const tempFile = `${dir}/next.load.js` as any;
      jest.spyOn(fs, 'readdirSync').mockReturnValueOnce([tempFile]);
      jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(code);
      const { loaders, hydraters } = getLoadersAndHydratorsLists(dir);
      expect(loaders).toEqual(['*', '/some/path']);
      expect(hydraters).toEqual(['*', '/some/another/path']);
    });
    it('should work without loaders', async () => {
      const dir = '/path/to/directory';
      const code = `
        export default {
          hydrate: {
            '*': () => {},
            '/some/another/path': async () => [1, 2, 3],
          },
        }
      `;
      const tempFile = `${dir}/next.load.js` as any;
      jest.spyOn(fs, 'readdirSync').mockReturnValueOnce([tempFile]);
      jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(code);
      const { loaders, hydraters } = getLoadersAndHydratorsLists(dir);
      expect(loaders).toEqual([]);
      expect(hydraters).toEqual(['*', '/some/another/path']);
    });
    it('should work without hydraters', async () => {
      const dir = '/path/to/directory';
      const code = `
        export default {
          load: {
            '*': () => {},
            '/some/path': async () => [1, 2, 3],
          },
        }
      `;
      const tempFile = `${dir}/next.load.js` as any;
      jest.spyOn(fs, 'readdirSync').mockReturnValueOnce([tempFile]);
      jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(code);
      const { loaders, hydraters } = getLoadersAndHydratorsLists(dir);
      expect(loaders).toEqual(['*', '/some/path']);
      expect(hydraters).toEqual([]);
    });
    it('should work without loaders nor hydraters', async () => {
      const dir = '/path/to/directory';
      const code = 'export default {}';
      const tempFile = `${dir}/next.load.js` as any;
      jest.spyOn(fs, 'readdirSync').mockReturnValueOnce([tempFile]);
      jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(code);
      const { loaders, hydraters } = getLoadersAndHydratorsLists(dir);
      expect(loaders).toEqual([]);
      expect(hydraters).toEqual([]);
    });
    it('should work with a different export default', async () => {
      const dir = '/path/to/directory';
      const code = 'export default ["another", "export"]]';
      const tempFile = `${dir}/next.load.js` as any;
      jest.spyOn(fs, 'readdirSync').mockReturnValueOnce([tempFile]);
      jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(code);
      const { loaders, hydraters } = getLoadersAndHydratorsLists(dir);
      expect(loaders).toEqual([]);
      expect(hydraters).toEqual([]);
    });
  })
});
