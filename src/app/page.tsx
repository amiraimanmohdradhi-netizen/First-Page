// src/pages/page.tsx
"use client"; // This is crucial! It tells Next.js to render this component on the client-side.

import dynamic from 'next/dynamic';

// We use dynamic import to ensure the component is only loaded on the client-side.
const ARScene = dynamic(() => import('@/components/ARScene'), {
  ssr: false,
});

export default function Home() {
  return (
    <main>
      <h1>My AR Project</h1>
      <ARScene />
    </main>
  );
}