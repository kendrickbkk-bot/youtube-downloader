import Downloader from './components/Downloader';

export default function Home() {
  return (
    <main className="min-h-screen p-8 md:p-24 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center">
      <div className="w-full max-w-5xl">
        <Downloader />
      </div>

      <footer className="mt-12 text-zinc-500 text-sm">
        <p>Built with Next.js & @distube/ytdl-core</p>
      </footer>
    </main>
  );
}
