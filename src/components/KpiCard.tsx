"use client";

interface KpiCardProps {
  label: string;
  value: number;
  unit: string;
}

export default function KpiCard({ label, value, unit }: KpiCardProps) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <div className="mt-1 text-2xl font-bold tracking-tight">
        {unit === "円" ? `¥${value.toLocaleString()}` : value.toLocaleString()}
        {unit !== "円" && (
          <span className="ml-1 text-base font-normal text-gray-500">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
