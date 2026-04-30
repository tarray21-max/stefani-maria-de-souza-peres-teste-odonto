import { Shield } from "lucide-react";
import { scoreColorVar } from "@/lib/checklist-data";

interface Props {
  score: number;
}

// Builds a "shield being constructed" effect: layers of brick-like segments
// fill in as the maturity score grows.
export function ShieldBuilder({ score }: Props) {
  const value = Math.max(0, Math.min(100, score));
  const color = scoreColorVar(value);
  const rows = 6;
  const cols = 5;
  const totalBricks = rows * cols;
  const filled = Math.round((value / 100) * totalBricks);

  return (
    <div className="relative flex flex-col items-center justify-center p-6 rounded-xl bg-gradient-to-br from-primary/5 to-primary-glow/10 border border-border/50 h-full">
      <div className="relative w-40 h-48">
        {/* Brick grid clipped by shield silhouette */}
        <svg viewBox="0 0 100 120" className="absolute inset-0 w-full h-full">
          <defs>
            <clipPath id="shield-clip">
              <path d="M50 4 L92 18 L92 60 C92 88 72 108 50 116 C28 108 8 88 8 60 L8 18 Z" />
            </clipPath>
          </defs>
          {/* background outline */}
          <path
            d="M50 4 L92 18 L92 60 C92 88 72 108 50 116 C28 108 8 88 8 60 L8 18 Z"
            fill="oklch(0.96 0.01 230)"
            stroke="oklch(0.85 0.02 230)"
            strokeWidth="1"
          />
          <g clipPath="url(#shield-clip)">
            {Array.from({ length: totalBricks }).map((_, i) => {
              const row = Math.floor(i / cols);
              const col = i % cols;
              // fill from bottom to top for "building up" effect
              const reverseIndex = (rows - 1 - row) * cols + col;
              const isFilled = reverseIndex < filled;
              const w = 100 / cols;
              const h = 120 / rows;
              return (
                <rect
                  key={i}
                  x={col * w + 1}
                  y={row * h + 1}
                  width={w - 2}
                  height={h - 2}
                  fill={isFilled ? color : "transparent"}
                  opacity={isFilled ? 0.85 : 0}
                  rx={1.5}
                  style={{ transition: "all 600ms ease-out" }}
                />
              );
            })}
          </g>
          <path
            d="M50 4 L92 18 L92 60 C92 88 72 108 50 116 C28 108 8 88 8 60 L8 18 Z"
            fill="none"
            stroke={color}
            strokeWidth="2"
            opacity={0.4 + (value / 100) * 0.6}
          />
        </svg>
        <Shield
          className="absolute inset-0 m-auto w-10 h-10"
          style={{ color, opacity: 0.3 + (value / 100) * 0.7 }}
          strokeWidth={2.2}
        />
      </div>
      <p className="mt-4 text-sm text-center text-muted-foreground max-w-[200px]">
        Sua blindagem regulatória está sendo construída.
      </p>
    </div>
  );
}
