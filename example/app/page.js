import { consume } from 'next-load';

export function load() {
  return 'WORKS😊';
}

export default function Page() {
  return consume() ?? 'No!😅';
}
