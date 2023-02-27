import fs from 'fs'
import { getLoadersAndHydratorsLists, isPageOfTheList } from "../src/utils";

describe('utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isPageOfTheList', () => {
    it('should return true with /about string', () => {
      const result = isPageOfTheList('/about', ['/about', '/contact', '/blog/[slug]']);
      expect(result).toBeTruthy();
    })
    it('should return false if the /about string is not in the list', () => {
      const result = isPageOfTheList('/about', ['/about', '/contact', '/blog/[slug]']);
      expect(result).toBeTruthy();
    })
    it('should work with regex in the list', () => {
      const result = isPageOfTheList('/about', ['/contact', '/blog/[slug]', /about/g]);
      expect(result).toBeTruthy();
    })
  })

  describe('getLoadersAndHydratorsLists', () => {
    it('should work with export default', async () => {
      const dir = '/path/to/directory';
      const code = `
        import some from 'some';

        export default {
          user: {
            pages: ['/', '/about', '/contact', '/blog/[slug]'],
            load: async () => ({ username: 'aralroca', displayName: 'Aral Roca' }),
            hydrate: (user) => ({ username: user.username })
          },
          posts: {
            pages: ['/blog/[slug]', '/blog/[slug]/comments'],
            load: async () => [{ title: 'My first post', content: 'Hello world!' }],
          },
        }
      `;
      const tempFile = `${dir}/next.load.js` as any;
      jest.spyOn(fs, 'readdirSync').mockReturnValueOnce([tempFile]);
      jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(code);
      const { loaders, hydraters } = getLoadersAndHydratorsLists(dir);
      expect(loaders).toEqual(['/', '/about', '/contact', '/blog/[slug]', '/blog/[slug]/comments']);
      expect(hydraters).toEqual(['/', '/about', '/contact', '/blog/[slug]']);
    });
    it('should work with pages as RegExp in default export', async () => {
      const dir = '/path/to/directory';
      const code = `
        import some from 'some';

        export default {
          user: {
            pages: ['/', '/about', '/contact', new RegExp('/example/[a-z]+')],
            load: async () => ({ username: 'aralroca', displayName: 'Aral Roca' }),
            hydrate: (user) => ({ username: user.username })
          },
          posts: {
            pages: ['/blog/[slug]', '/blog/[slug]/comments'],
            load: async () => [{ title: 'My first post', content: 'Hello world!' }],
          },
        }
      `;
      const tempFile = `${dir}/next.load.js` as any;
      jest.spyOn(fs, 'readdirSync').mockReturnValueOnce([tempFile]);
      jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(code);
      const { loaders, hydraters } = getLoadersAndHydratorsLists(dir);
      expect(loaders).toEqual(['/', '/about', '/contact', /\/example\/[a-z]+/, '/blog/[slug]', '/blog/[slug]/comments']);
      expect(hydraters).toEqual(['/', '/about', '/contact', /\/example\/[a-z]+/,]);
    });
    it('should work with module.exports', async () => {
      const dir = '/path/to/directory';
      const code = `
        module.exports = {
          user: {
            pages: ['/', '/about', '/contact', '/blog/[slug]'],
            load: async () => ({ username: 'aralroca', displayName: 'Aral Roca' }),
            hydrate: (user) => ({ username: user.username })
          },
          posts: {
            pages: ['/blog/[slug]', '/blog/[slug]/comments'],
            load: async () => [{ title: 'My first post', content: 'Hello world!' }],
          },
        }
      `;
      const tempFile = `${dir}/next.load.js` as any;
      jest.spyOn(fs, 'readdirSync').mockReturnValueOnce([tempFile]);
      jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(code);
      const { loaders, hydraters } = getLoadersAndHydratorsLists(dir);
      expect(loaders).toEqual(['/', '/about', '/contact', '/blog/[slug]', '/blog/[slug]/comments']);
      expect(hydraters).toEqual(['/', '/about', '/contact', '/blog/[slug]']);
    });
    it('should work with pages as RegExp in module.exports', async () => {
      const dir = '/path/to/directory';
      const code = `
        const some = require('some');

        module.exports = {
          user: {
            pages: ['/', '/about',new RegExp('/contact/[a-z]+'), /\\/example\\/[a-z]+/,
            load: async () => ({ username: 'aralroca', displayName: 'Aral Roca' }),
            hydrate: (user) => ({ username: user.username })
          },
          posts: {
            pages: ['/blog/[slug]', '/blog/[slug]/comments'],
            load: async () => [{ title: 'My first post', content: 'Hello world!' }],
          },
        }
      `;
      const tempFile = `${dir}/next.load.js` as any;
      jest.spyOn(fs, 'readdirSync').mockReturnValueOnce([tempFile]);
      jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(code);
      const { loaders, hydraters } = getLoadersAndHydratorsLists(dir);
      expect(loaders).toEqual(['/', '/about', new RegExp('/contact/[a-z]+'), new RegExp('/example/[a-z]+'), '/blog/[slug]', '/blog/[slug]/comments']);
      expect(hydraters).toEqual(['/', '/about', new RegExp('/contact/[a-z]+'), new RegExp('/example/[a-z]+'),]);
    });
    it('should work without loaders', async () => {
      const dir = '/path/to/directory';
      const code = `
        export default {
          user: {
            pages: ['/', '/about', '/contact', '/blog/[slug]'],
            hydrate: (user) => ({ username: user.username })
          },
        }
      `;
      const tempFile = `${dir}/next.load.js` as any;
      jest.spyOn(fs, 'readdirSync').mockReturnValueOnce([tempFile]);
      jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(code);
      const { loaders, hydraters } = getLoadersAndHydratorsLists(dir);
      expect(loaders).toEqual([]);
      expect(hydraters).toEqual(['/', '/about', '/contact', '/blog/[slug]']);
    });
    it('should work without hydraters', async () => {
      const dir = '/path/to/directory';
      const code = `
        export default {
          user: {
            pages: ['/', '/about', '/contact', '/blog/[slug]'],
            load: async () => ({ username: 'aralroca', displayName: 'Aral Roca' }),
          },
          posts: {
            pages: ['/blog/[slug]', '/blog/[slug]/comments'],
            load: async () => [{ title: 'My first post', content: 'Hello world!' }],
          },
        }
      `;
      const tempFile = `${dir}/next.load.js` as any;
      jest.spyOn(fs, 'readdirSync').mockReturnValueOnce([tempFile]);
      jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(code);
      const { loaders, hydraters } = getLoadersAndHydratorsLists(dir);
      expect(loaders).toEqual(['/', '/about', '/contact', '/blog/[slug]', '/blog/[slug]/comments']);
      expect(hydraters).toEqual([]);
    });
    it('should work with empty object as export', async () => {
      const dir = '/path/to/directory';
      const code = 'export default {}';
      const tempFile = `${dir}/next.load.js` as any;
      jest.spyOn(fs, 'readdirSync').mockReturnValueOnce([tempFile]);
      jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(code);
      const { loaders, hydraters } = getLoadersAndHydratorsLists(dir);
      expect(loaders).toEqual([]);
      expect(hydraters).toEqual([]);
    });
    it('should work with undefined as export', async () => {
      const dir = '/path/to/directory';
      const code = 'export default undefined';
      const tempFile = `${dir}/next.load.js` as any;
      jest.spyOn(fs, 'readdirSync').mockReturnValueOnce([tempFile]);
      jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(code);
      const { loaders, hydraters } = getLoadersAndHydratorsLists(dir);
      expect(loaders).toEqual([]);
      expect(hydraters).toEqual([]);
    });
    it('should work without an export', async () => {
      const dir = '/path/to/directory';
      const code = 'const example = true';
      const tempFile = `${dir}/next.load.js` as any;
      jest.spyOn(fs, 'readdirSync').mockReturnValueOnce([tempFile]);
      jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(code);
      const { loaders, hydraters } = getLoadersAndHydratorsLists(dir);
      expect(loaders).toEqual([]);
      expect(hydraters).toEqual([]);
    });
    it('should work with empty loaders and hydraters as export', async () => {
      const dir = '/path/to/directory';
      const code = 'export default { example: { pages: ["/"]} }';
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
