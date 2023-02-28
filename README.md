<p align="center">
    <img src="./next-load-logo.svg" height="96">
    <h1 align="center">Next load</h1>
</p>

<p align="center">
  <b>Load</b> data in one place. <b>Hydrate</b> some parts. <b>Consume</b> everywhere.
</p>

<p align="center">
  <a href="#getting-started"><strong>Getting started</strong></a> ·
  <a href="#load"><strong>Load</strong></a> ·
  <a href="#hydrate"><strong>Hydrate</strong></a> ·
  <a href="#consume"><strong>Consume</strong></a>
</p>
<br/>

[![npm version](https://badge.fury.io/js/next-load.svg)](https://badge.fury.io/js/next-load)
![npm](https://img.shields.io/npm/dw/next-load)
[![size](https://img.shields.io/bundlephobia/minzip/next-load)](https://bundlephobia.com/package/next-load)
<a href="https://github.com/aralroca/next-load/actions?query=workflow%3ACI" alt="Tests status">
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/aralroca/next-translate-plugin/blob/main/CONTRIBUTING.md)
<img src="https://github.com/aralroca/next-load/workflows/CI/badge.svg" /></a>
<a href="https://twitter.com/intent/follow?screen_name=aralroca">
<img src="https://img.shields.io/twitter/follow/aralroca?style=social&logo=twitter"
            alt="follow on Twitter"></a>

**Next Load** is a simple and lightweight library (~500B) that makes it easy to manage data loading and hydration in **Next.js +13 app dir** projects.

With Next Load, you can **load** data in one place, **hydrate** some parts, and **consume** everywhere, all while keeping your code organized and easy to maintain.

> ❗️ Missing support for layout.js, template.js, route.js, loading.js, error.js, global-error.js, and not-found.js. For now, **until v1.0** is only available for the **page** and its **subcomponents** / **helpers** and we will support the rest in the next versions.

| Method  | Description                                                        | Usage                             |
|---------|--------------------------------------------------------------------|-----------------------------------|
| [`load`](#load)    | Loads data in one place.                                           | Server/client pages|
| [`hydrate`](#hydrate) | Facilitates the transfer of server data defined in the load function to client components. | Server pages                       |
| [`consume`](#consume) | Enables the consumption of data loaded by the load method.         | Server/client pages/components/helpers    |

## Getting started

### Install

To install this library, you can use npm or yarn:

```bash
> npm install next-load
> npm install --save-dev next-load-plugin
```

or

```bash
> yarn add next-load
> yarn add -D next-load-plugin
```

### Activate

To add the `next-load-plugin` to your Next.js project, you need to modify the `next.config.js` file:

**next.config.js**:
```js
const nextLoad = require('next-load-plugin');

module.exports = nextLoad({
    experimental: { appDir: true },
    // Your Next.js configuration options go here
});
```

### Configure

To add the `load` and `hydrate` logic, create a new file called **next.load.js** at the same level as **next.config.js**. This file can be either CommonJS or ECMAScript module, and can have any of the following extensions: `js`, `ts`, `mjs`, `cjs`, `jsx`, `tsx`. We recommend using **next.load.ts** or **next.load.js** if you are not using TypeScript.

The file should have the following structure:

**next.load.ts**
```ts
import { Post, User } from "./app/types"

export default {
  user: {
    pages: ['/', '/about', '/contact', '/blog/[slug]', new RegExp('^/example')],
    load: getUser,
    hydrate: mapUserDataForClientSide,
  },
  posts: {
    pages: ['/blog/[slug]', '/blog/[slug]/comments'],
    load: getPosts,
  },
  // ... Other data you need in your pages
}

async function getUser(): Promise<User> {
  return { username: 'aralroca', displayName: 'Aral Roca' }
}

function mapUserDataForClientSide(user: User, pathname: string): User {
  if (pathname.startsWith('/blog')) return { username: user.username }
}

async function getPosts(): Promise<Post[]> {
  return [{ title: 'My first post', content: 'Hello world!' }]
}
```

To better understand how `load` and `hydrate` work within this configuration, please refer to the following sections.

### Use

After that, you can `consume` this data in your pages / components / helpers in a easy way:

```ts
import { consume } from 'next-load'

export default function Page() {
  const { user, posts } = consume()
  // ...
}
```

## load

The idea of this function (can be async or not) is to configure a single function that loads a single data type for all pages that need it. We understand that the content returned by this function may vary depending on the pages, so this function supports two arguments:

- **`props`: { pageProps }**: Here we receive an object `{ pageProps }`. Currently, it has this structure because in upcoming releases we will also receive `layoutProps`, `templateProps`, `routeProps`, `notFoundProps`, `loadingProps`, etc.
- **`pathname`: string**: Here we receive the `pathname`. If you're working on the file `app/about-us/page.ts` you will receive `/about-us` as the `pathname`.

It can return whatever is needed.

**next.load.ts**
```ts
export default {
  user: {
    pages: ['/'],
    load: async (({ pageProps }, pathname: string) => {
       const res = await fetch('https://api.example.com/user...');
       if (!res.ok) throw new Error('Failed to fetch user');
       return res.json();
    }),
  },
}
```

## hydrate

The **`hydrate`** method (optional) facilitates the transfer of server data defined in the `load` function to client components of a server page in order to be `consume` it.

By default if the `hydrate` is not defined, all the `load` data is going to be hydrated.

This method is applicable in a **server page** and will receive two parameters:

- **`load data`** - The data loaded by the `load` function previously.
- **`pathname`: string**: This allows pages that do not need hydration to return `undefined`, for example.

**next.load.ts**
```ts
export default {
  user: {
    // all pages
    pages: [new RegExp('^/')], 
    // Using 'hydrate' then the 'load' function is only for server pages/components
    load: async () =>  /* ... */,
    // `hydrate` is the data that client components are going to consume inside a server page
    hydrate: (user: User, pathname: string) => {
      // Ex: Documentation client components don't need the user
      if(pathname.startsWith('/documentation')) return
      // Client components only need the username. Avoid hydrating inecessary data.
      return { username: user.username }
    }
  },
}
```


## consume

The **`consume`** method enables the consumption of data loaded by the `load` method. It returns the previously loaded data or the hydrated data on the client-side. This method can be utilized within **pages**, **components**, or **helpers**, without being restricted to the usage within a component as it is not a hook. The following example demonstrates its usage:

**app/page.tsx**
```tsx
import { consume } from 'next-load'

function helper() {
  const { user, posts } = consume<MyDataType>();
  // ...
}

function Component() {
  const { user, posts } = consume<MyDataType>();
  // ...
}

export default function Page() {
  const { user, posts } = consume<MyDataType>();
  // ...
}
```

**app/client/page.tsx**
```tsx
"use client"
import { consume } from 'next-load'

function clientHelper() {
  const { user, posts } = consume<MyDataType>();
  // ...
}

function ClientComponent() {
  const { user, posts } = consume<MyDataType>();
  // ...
}

export default function MyClientPage() {
  const { user, posts } = consume<MyDataType>();
  // ...
}
```
