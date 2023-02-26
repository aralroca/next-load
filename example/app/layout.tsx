export const metadata = {
  title: 'Next.js next-load example',
  description: 'Next load example',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
