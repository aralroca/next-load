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

**Next Load** is a simple and lightweight library (~300B) that makes it easy to manage data loading and hydration in **Next.js +13 app dir** projects.

With Next Load, you can **load** data in one place, **hydrate** some parts, and **consume** everywhere, all while keeping your code organized and easy to maintain.

| Method  | Description                                                        | Usage                             |
|---------|--------------------------------------------------------------------|-----------------------------------|
| `load`    | Loads data in one place.                                           | Server/client pages|
| `hydrate` | Facilitates the transfer of server data defined in the load function to client components. | Server pages                       |
| `consume` | Enables the consumption of data loaded by the load method.         | Server/client pages/components/helpers    |

## Getting started

To install this library, you can use npm or yarn:

```bash
npm install next-load && npm install --save-dev next-load-plugin
```

or

```bash
yarn add next-load && yarn add -D next-load-plugin
```

To add the `next-load-plugin` to your Next.js project, you need to modify the `next.config.js` file:

**next.config.js**:
```js
const nextLoad = require('next-load-plugin');

module.exports = nextLoad({
  // Your Next.js configuration options go here
});
```

## load

The `load` method allows you to load data in one place. It is a function that returns a promise that resolves to the data you want to load. You can use this method inside your **server/client page**, as in the following example:

**app/page.tsx**
```ts
import { consume } from 'next-load'

// You should export the "load" function
export async function load({ searchParams }): User {
  const userId = searchParams.get('userId')
  const response = await fetch(`https://my-api/api/user/${userId}`);
  return response.json();
}

export default function MyPage() {
  const user = consume<User>();
  // ...
}
```

## hydrate

The **`hydrate`** method (optional) facilitates the transfer of server data defined in the `load` function to client components of a server page in order to be `consume` it.

By default if the `hydrate` is not defined, all the `load` data is going to be hydrated.


This method is applicable in a **server page**, and can be implemented as shown in the example below:

**app/page.tsx**
```tsx
import { consume } from 'next-load'

// This map the data to be used in the client components
export async function hydrate(user: User): string {
  return user.username
}

// Using hydrate, this loads the data only to be used in the server part
export async function load({ searchParams }): User {
  const userId = searchParams.get('userId')
  const response = await fetch(`https://my-api/api/user/${userId}`);
  return response.json();
}

export default function MyPage() {
  const user = consume<User>();
  // ...
}
```

**app/server-component.tsx**
```tsx
import { consume } from 'next-load'

export default function MyServerComponent() {
  const user = consume<User>();
  // ...
}
```

In contrast, a client component only consumes the `username`:


**app/client-component.tsx**
```tsx
"use client";
import { consume } from 'next-load'

export default function MyClientComponent() {
  const username = consume<string>();
  // ...
}
```

## consume

The **`consume`** method enables the consumption of data loaded by the `load` method. It returns the previously loaded data or the hydrated data on the client-side. This method can be utilized within pages, components, or helpers, without being restricted to the usage within a component as it is not a hook. The following example demonstrates its usage:

**app/server-page.tsx**
```tsx
import { consume } from 'next-load'

export function load(): User {
  // ...
}

export default function MyServerPage() {
  const user = consume<User>();
  // ...
}
```

**app/client-page.tsx**
```tsx
"use client"
import { consume } from 'next-load'

export function load(): User {
  // ...
}

export default function MyClientPage() {
  const user = consume<User>();
  // ...
}
```

**app/server-component.tsx**
```tsx
import { consume } from 'next-load'

export default function MyServerComponent() {
  const user = consume<User>();
  // ...
}
```

**app/client-component.tsx**
```tsx
"use client";
import { consume } from 'next-load'

export default function MyClientComponent() {
  const user = consume<User>();
  // ...
}
```