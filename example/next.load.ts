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
