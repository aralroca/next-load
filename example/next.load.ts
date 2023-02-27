export default {
  user: {
    pages: ['/', '/about', '/contact', '/blog/[slug]'],
    load: getUser,
    hydrate: mapUserDataForClientSide,
  },
  posts: {
    pages: ['/blog/[slug]', '/blog/[slug]/comments'],
    load: getPosts,
  },
}

type User = {
  displayName?: string
  username: string
}

type Post = {
  title: string
  content: string
}

async function getUser(): Promise<User> {
  return { username: 'aralroca', displayName: 'Aral Roca' }
}

function mapUserDataForClientSide(user: User): User {
  return { username: user.username }
}

async function getPosts(): Promise<Post[]> {
  return [{ title: 'My first post', content: 'Hello world!' }]
}
