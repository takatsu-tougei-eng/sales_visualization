"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface SeriesConfig {
  key: string;
  color: string;
  label: string;
}

interface SalesChartProps {
  title: string;
  data: Record<string, string | number>[];
  bars: SeriesConfig[];
  lines: SeriesConfig[];
  yAxisLabel: string;
}

const formatNumber = (v: number) => v.toLocaleString();

export default function SalesChart({
  title,
  data,
  bars,
  lines,
  yAxisLabel,
}: SalesChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        <p className="text-gray-500">データがありません</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis
            yAxisId="daily"
            label={{
              value: yAxisLabel,
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12 },
            }}
            tick={{ fontSize: 11 }}
            tickFormatter={formatNumber}
          />
          <YAxis
            yAxisId="cumulative"
            orientation="right"
            label={{
              value: "累計",
              angle: 90,
              position: "insideRight",
              style: { fontSize: 12 },
            }}
            tick={{ fontSize: 11 }}
            tickFormatter={formatNumber}
          />
          <Tooltip />
          <Legend />
          {bars.map((bar) => (
            <Bar
              key={bar.key}
              yAxisId="daily"
              dataKey={bar.key}
              name={bar.label}
              fill={bar.color}
              stackId="daily"
            />
          ))}
          {/* 白い縁取り（ハロー） */}
          {lines.map((line) => (
            <Line
              key={`${line.key}-halo`}
              yAxisId="cumulative"
              type="monotone"
              dataKey={line.key}
              stroke="#ffffff"
              strokeWidth={5}
              dot={false}
              activeDot={false}
              connectNulls
              legendType="none"
            />
          ))}
          {/* 色付き線 */}
          {lines.map((line) => (
            <Line
              key={line.key}
              yAxisId="cumulative"
              type="monotone"
              dataKey={line.key}
              name={line.label}
              stroke={line.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
