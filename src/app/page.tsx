"use client";

import { useEffect, useState } from "react";
import SalesChart from "@/components/SalesChart";
import type { SeriesConfig } from "@/components/SalesChart";
import KpiCard from "@/components/KpiCard";
import type { DailySummary } from "@/lib/types";

const TIME_SLOT_COLORS: Record<string, string> = {
  第1部: "#2563eb",
  第2部: "#16a34a",
  第3部: "#ea580c",
  第4部: "#9333ea",
  第5部: "#dc2626",
};

function cumKey(slot: string) {
  return `${slot}(累計)`;
}

interface PivotRow {
  date: string;
  [key: string]: string | number;
}

function pivotData(
  summaries: DailySummary[],
  itemType: string,
  valueField: "total_amount" | "total_quantity"
): { data: PivotRow[]; slots: string[] } {
  const filtered = summaries.filter((s) => s.item_type === itemType);
  const slots = [...new Set(filtered.map((s) => s.time_slot))].sort();
  const dateMap = new Map<string, PivotRow>();

  for (const row of filtered) {
    if (!dateMap.has(row.order_date)) {
      const pivot: PivotRow = { date: row.order_date };
      for (const slot of slots) {
        pivot[slot] = 0;
        pivot[cumKey(slot)] = 0;
      }
      dateMap.set(row.order_date, pivot);
    }
    const pivot = dateMap.get(row.order_date)!;
    pivot[row.time_slot] =
      (pivot[row.time_slot] as number) + row[valueField];
  }

  const data = [...dateMap.values()].sort((a, b) =>
    (a.date as string).localeCompare(b.date as string)
  );

  // 時間帯別の累計を計算
  const cumulative: Record<string, number> = {};
  for (const slot of slots) {
    cumulative[slot] = 0;
  }
  for (const row of data) {
    for (const slot of slots) {
      cumulative[slot] += (row[slot] as number) || 0;
      row[cumKey(slot)] = cumulative[slot];
    }
  }

  return { data, slots };
}

function buildBars(slots: string[]): SeriesConfig[] {
  return slots.map((slot) => ({
    key: slot,
    color: TIME_SLOT_COLORS[slot] ?? "#6b7280",
    label: slot,
  }));
}

function buildLines(slots: string[]): SeriesConfig[] {
  return slots.map((slot) => ({
    key: cumKey(slot),
    color: TIME_SLOT_COLORS[slot] ?? "#6b7280",
    label: `${slot}(累計)`,
  }));
}

export default function Dashboard() {
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((json) => {
        setSummaries(json.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const kpiTypes = ["手回しロクロ", "電動ロクロ"] as const;
  const kpis = kpiTypes.flatMap((type) => {
    const rows = summaries.filter((s) => s.item_type === type);
    const amount = rows.reduce((sum, r) => sum + r.total_amount, 0);
    const qty = rows.reduce((sum, r) => sum + r.total_quantity, 0);
    return [
      { label: `${type} 売上金額`, value: amount, unit: "円" },
      { label: `${type} 注文件数`, value: qty, unit: "件" },
    ];
  });

  const itemTypes = [...new Set(summaries.map((s) => s.item_type))].sort();

  const charts = itemTypes.flatMap((itemType) => {
    const amount = pivotData(summaries, itemType, "total_amount");
    const quantity = pivotData(summaries, itemType, "total_quantity");
    return [
      {
        title: `${itemType} 売上金額推移`,
        data: amount.data,
        bars: buildBars(amount.slots),
        lines: buildLines(amount.slots),
        yAxisLabel: "金額 (棒グラフ)",
      },
      {
        title: `${itemType} 注文件数推移`,
        data: quantity.data,
        bars: buildBars(quantity.slots),
        lines: buildLines(quantity.slots),
        yAxisLabel: "日別件数 (棒グラフ)",
      },
    ];
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">売上ダッシュボード</h1>
      {charts.length === 0 ? (
        <p className="text-gray-500">
          データがありません。CSVを取り込んでください。
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 mb-6">
            {kpis.map((kpi) => (
              <KpiCard
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                unit={kpi.unit}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {charts.map((chart) => (
              <SalesChart
                key={chart.title}
                title={chart.title}
                data={chart.data}
                bars={chart.bars}
                lines={chart.lines}
                yAxisLabel={chart.yAxisLabel}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
