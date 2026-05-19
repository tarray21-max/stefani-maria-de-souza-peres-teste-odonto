import { scoreColorVar, scoreLabel } from "@/lib/checklist-data";

interface Props {
  score: number;
  size?: number;
}

/**
 * Simple circular gauge: a ring that fills with the maturity color and the
 * percentage centered inside. Replaces the previous stylized tooth.
 */
export function ToothGauge({ score, size = 240 }: Props) {
  const value = Math.max(0, Math.min(100, score));
  const color = scoreColorVar(value);
  const stroke = Math.max(10, Math.round(size * 0.07));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(0.94 0.005 230)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 600ms ease, stroke 400ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-5xl font-bold tracking-tight" style={{ color }}>
          {Math.round(value)}%
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">
          {scoreLabel(value)}
        </div>
      </div>
    </div>
  );
}
