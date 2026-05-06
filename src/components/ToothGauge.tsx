import { scoreColorVar, scoreLabel } from "@/lib/checklist-data";

interface Props {
  score: number;
  size?: number;
}

/**
 * Stylized tooth (molar) SVG that fills from bottom to top with the
 * maturity color, with the % centered inside it.
 */
export function ToothGauge({ score, size = 280 }: Props) {
  const value = Math.max(0, Math.min(100, score));
  const color = scoreColorVar(value);
  const fillId = `tooth-fill-${Math.round(value)}`;

  // Tooth path (simplified molar with two roots)
  const toothPath =
    "M50,10 C30,10 18,22 18,40 C18,52 22,60 24,72 C26,86 30,104 38,118 C42,126 48,128 52,118 C56,108 58,96 62,96 C66,96 68,108 72,118 C76,128 82,126 86,118 C94,104 98,86 100,72 C102,60 106,52 106,40 C106,22 94,10 74,10 C66,10 62,16 56,16 C50,16 50,10 50,10 Z";

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg viewBox="0 0 124 134" width={size} height={size}>
        <defs>
          <linearGradient id={fillId} x1="0" x2="0" y1="1" y2="0">
            <stop offset="0%" stopColor={color} />
            <stop offset={`${value}%`} stopColor={color} />
            <stop offset={`${value}%`} stopColor="oklch(0.96 0.005 230)" />
            <stop offset="100%" stopColor="oklch(0.96 0.005 230)" />
          </linearGradient>
        </defs>
        <g transform="translate(11,5)">
          <path d={toothPath} fill={`url(#${fillId})`} stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-4xl font-bold tracking-tight" style={{ color }}>
          {Math.round(value)}%
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
          {scoreLabel(value)}
        </div>
      </div>
    </div>
  );
}
