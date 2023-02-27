import { consume } from 'next-load';

type User = {
  displayName: string;
  username: string;
}

export async function load() {
  const user: User = await Promise.resolve({
    displayName: 'Works',
    username: 'next-load-example'
  });
  return user.displayName;
}

export default function Page() {
  const text = consume<string>();
  return <h1>{text}</h1>;
}
