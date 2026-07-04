import GraphBuilder from '@/components/GraphBuilder';

export default function CalculatorPage() {
  return (
    <main className="margin-rule max-w-5xl mx-auto px-6 pt-5 pb-12 w-full">
      <div className="mb-4">
        <h1 className="font-display font-semibold text-ink text-[26px] mb-1">
          Nim value calculator
        </h1>
        <p className="text-graphite text-sm">
          Sketch a graph, set the piles, and compute the position&apos;s nim value.
        </p>
      </div>
      <GraphBuilder />
    </main>
  );
}
