import Link from "next/link";

export default function Home() {
  return (
    <main>
      <p>landing page</p>
      <Link href="/agent">Go to Agent</Link>
    </main>
  );
}
