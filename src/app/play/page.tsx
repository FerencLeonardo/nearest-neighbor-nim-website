import GameBoard from '@/components/GameBoard';

export default function PlayPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-4 w-full">
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-white mb-1">Play Nearest Neighbor Nim</h1>
        <p className="text-slate-400 text-sm">
          Build your graph, pick a difficulty, and challenge the computer.
        </p>
      </div>
      <GameBoard />
    </main>
  );
}
