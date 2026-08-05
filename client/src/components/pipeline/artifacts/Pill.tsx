type Tone = 'critical' | 'high' | 'medium' | 'low' | 'good' | 'bad' | 'neutral';

const TONE_STYLE: Record<Tone, string> = {
  critical: 'bg-red-900/50 text-red-300 border-red-700',
  high: 'bg-amber-900/50 text-amber-300 border-amber-700',
  medium: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  low: 'bg-gray-800 text-gray-400 border-gray-700',
  good: 'bg-emerald-900/40 text-emerald-300 border-emerald-800',
  bad: 'bg-red-900/40 text-red-300 border-red-800',
  neutral: 'bg-blue-900/30 text-blue-400 border-blue-800',
};

export default function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded border whitespace-nowrap ${TONE_STYLE[tone]}`}>
      {children}
    </span>
  );
}
