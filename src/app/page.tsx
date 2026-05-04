import GraphBuilder from '@/components/GraphBuilder';

export default function CalculatorPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-4 w-full">
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-white mb-1">Nim Value Calculator</h1>
        <p className="text-slate-400 text-sm">
          Add nodes, connect them, set pile sizes, then calculate the Nim value.
        </p>
      </div>
      <GraphBuilder />
    </main>
  );
}
