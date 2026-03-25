import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)] gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Landing page</h1>
      <Link
        href="/agent"
        className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-neutral-800 transition-colors"
      >
        Go to Agent
      </Link>
    </main>
  );
}
