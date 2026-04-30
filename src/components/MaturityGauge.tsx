import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { scoreColorVar, scoreLabel } from "@/lib/checklist-data";

interface Props {
  score: number;
}

export function MaturityGauge({ score }: Props) {
  const value = Math.max(0, Math.min(100, score));
  const color = scoreColorVar(value);
  const data = [
    { name: "filled", value },
    { name: "rest", value: 100 - value },
  ];

  return (
    <div className="relative w-full aspect-square max-w-[320px] mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            startAngle={90}
            endAngle={-270}
            innerRadius="72%"
            outerRadius="92%"
            dataKey="value"
            stroke="none"
            isAnimationActive={true}
          >
            <Cell fill={color} />
            <Cell fill="oklch(0.95 0.01 230)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-5xl font-bold tracking-tight" style={{ color }}>
          {Math.round(value)}%
        </div>
        <div className="text-sm font-medium mt-1 text-muted-foreground uppercase tracking-wider">
          {scoreLabel(value)}
        </div>
      </div>
    </div>
  );
}
