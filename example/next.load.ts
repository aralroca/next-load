export default {
  load: {
    '*': getUser,
  },
  hydrate: {
    '*': getUserName,
  }
}

type User = {
  displayName: string
  username: string
}

async function getUser() {
  return {
    displayName: 'Works in next.load.ts',
    username: 'next-load-example'
  }
}

async function getUserName(user: User) {
  return user.displayName
}
