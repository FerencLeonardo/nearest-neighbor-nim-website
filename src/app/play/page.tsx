import GameBoard from '@/components/GameBoard';

export default function PlayPage() {
  return (
    <main className="margin-rule max-w-5xl mx-auto px-6 pt-5 pb-12 w-full">
      <div className="mb-4">
        <h1 className="font-display font-semibold text-ink text-[26px] mb-1">
          Play Nearest Neighbor Nim
        </h1>
        <p className="text-graphite text-sm">
          Draw the board, choose who opens, and play against the computer.
        </p>
      </div>
      <GameBoard />
    </main>
  );
}
