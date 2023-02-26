import { consume } from 'next-load';

export function load() {
  return 'WORKS😊';
}

export default function Page() {
  const text = consume<string>();
  return <h1>{text}</h1>;
}
