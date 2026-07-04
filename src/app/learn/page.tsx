import Link from 'next/link';
import { PIP_LAYOUTS, PIP_RADIUS } from '@/lib/pips';

const INK = '#223056';
const PEN = '#2D53C8';
const REDPEN = '#C6392B';
const FADED = '#8A93A5';

function FigNode({
  x,
  y,
  label,
  count,
  note,
  noteColor,
}: {
  x: number;
  y: number;
  label: string;
  count: number;
  note?: string;
  noteColor?: string;
}) {
  const r = 26;
  const empty = count === 0;
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="#FFFFFF"
        stroke={empty ? FADED : INK}
        strokeWidth="1.5"
        strokeDasharray={empty ? '5 4' : undefined}
      />
      <text
        x={x + r * 0.82}
        y={y - r * 0.72}
        fill={empty ? FADED : INK}
        fontSize="14"
        fontStyle="italic"
        fontFamily="var(--font-stix), Georgia, serif"
      >
        {label}
      </text>
      {(PIP_LAYOUTS[count] ?? []).map(([dx, dy], i) => (
        <circle key={i} cx={x + dx} cy={y + dy} r={PIP_RADIUS} fill={INK} />
      ))}
      {note && (
        <text
          x={x}
          y={y + r + 20}
          textAnchor="middle"
          fill={noteColor ?? INK}
          fontSize="14"
          fontFamily="var(--font-plex-mono), monospace"
        >
          {note}
        </text>
      )}
    </g>
  );
}

function FigEdge({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth="2" strokeOpacity="0.6" />;
}

export default function LearnPage() {
  return (
    <main className="margin-rule max-w-3xl mx-auto px-6 pt-10 pb-16 w-full">
      <h1 className="font-display font-semibold text-ink text-3xl mb-2">
        Learn Nearest Neighbor Nim
      </h1>
      <p className="text-graphite mb-10">
        The rules of the game, what nim values mean, and how to read the calculator.
      </p>

      <section>
        <h2 className="font-display font-semibold text-ink text-xl mb-3">The board</h2>
        <p className="text-[15px] leading-relaxed mb-2">
          Nearest Neighbor Nim is Nim played on a graph. Every node holds a pile of
          stones, and the edges decide which piles can be touched next. One drawing —
          nodes, edges, and stones — is the entire state of the game.
        </p>
        <p className="text-[15px] leading-relaxed">
          Boards go up to 10 nodes, and each pile holds up to 5 stones.
        </p>
        <figure className="bg-card border border-grid rounded-lg px-4 py-3 my-5">
          <svg
            viewBox="0 0 360 110"
            className="w-full h-auto max-w-md mx-auto"
            role="img"
            aria-label="A path graph of three piles: A with 3 stones, B with 1, C with 2"
          >
            <FigEdge x1={70} y1={58} x2={180} y2={58} />
            <FigEdge x1={180} y1={58} x2={290} y2={58} />
            <FigNode x={70} y={58} label="A" count={3} />
            <FigNode x={180} y={58} label="B" count={1} />
            <FigNode x={290} y={58} label="C" count={2} />
          </svg>
          <figcaption className="text-graphite text-[13px] mt-1">
            A board with three piles on a path: A holds 3 stones, B holds 1, C holds 2.
          </figcaption>
        </figure>
      </section>

      <section className="mt-10">
        <h2 className="font-display font-semibold text-ink text-xl mb-3">How a move works</h2>
        <ol className="list-decimal pl-5 space-y-2 text-[15px] leading-relaxed marker:text-graphite">
          <li>
            On the opening move, take as many stones as you like — at least one — from
            any single pile.
          </li>
          <li>
            Every move after that must take stones from a pile that neighbors the last
            pile played.
          </li>
          <li>
            A pile counts as its own neighbor, so you may keep taking from the same
            pile while it still has stones.
          </li>
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="font-display font-semibold text-ink text-xl mb-3">Winning</h2>
        <p className="text-[15px] leading-relaxed">
          The game ends when every pile adjacent to the last move is empty. Whoever
          made that last move wins — the opponent has no reply. Play so that the final
          reachable stone is yours to take.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display font-semibold text-ink text-xl mb-3">Nim values and mex</h2>
        <p className="text-[15px] leading-relaxed mb-4">
          Every position has a number — its <em className="font-display">nim value</em>,
          also called a Grundy value. A value of 0 means the player to move loses
          against perfect play; any other value means they can force a win. Values are
          computed recursively: a position&apos;s value is the mex of the values of
          every position reachable in one move.
        </p>
        <aside className="border-l-2 border-pen pl-4 py-1 font-display italic text-[15px] text-ink">
          mex — the minimum excludant: the smallest number in 0, 1, 2, … that does not
          appear among the options.
        </aside>
      </section>

      <section className="mt-10">
        <h2 className="font-display font-semibold text-ink text-xl mb-3">Reading the calculator</h2>
        <p className="text-[15px] leading-relaxed">
          The calculator reports one value per node: the value of the position when the
          last stone was taken at that node. The headline number is the largest of
          them, and the verdict says who wins from there with perfect play.
        </p>
        <figure className="bg-card border border-grid rounded-lg px-4 py-3 my-5">
          <svg
            viewBox="0 0 360 128"
            className="w-full h-auto max-w-md mx-auto"
            role="img"
            aria-label="The same path with piles 0, 1, and 2; node A has value 0, nodes B and C have value 3"
          >
            <FigEdge x1={70} y1={54} x2={180} y2={54} />
            <FigEdge x1={180} y1={54} x2={290} y2={54} />
            <FigNode x={70} y={54} label="A" count={0} note="0" noteColor={REDPEN} />
            <FigNode x={180} y={54} label="B" count={1} note="3" noteColor={PEN} />
            <FigNode x={290} y={54} label="C" count={2} note="3" noteColor={PEN} />
          </svg>
          <figcaption className="text-graphite text-[13px] mt-1">
            Same board, piles 0, 1, 2. With play at A the mover can only reach
            B&apos;s single stone and loses soon after: value 0, marked in red. At B
            or C the mover can force a win: value 3.
          </figcaption>
        </figure>
      </section>

      <section className="mt-10 flex gap-3 flex-wrap">
        <Link
          href="/"
          className="px-5 py-2.5 bg-pen text-white text-sm font-medium rounded-md hover:bg-pen-deep transition-colors"
        >
          Open the calculator
        </Link>
        <Link
          href="/play"
          className="px-5 py-2.5 bg-card border border-grid text-ink text-sm font-medium rounded-md hover:border-ink transition-colors"
        >
          Play a game
        </Link>
      </section>
    </main>
  );
}
