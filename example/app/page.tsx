import { consume } from 'next-load';

export default function Page() {
  const data = consume<any>();
  return <h1>{JSON.stringify(data)}</h1>;
}
