"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  sankey,
  sankeyLinkHorizontal,
  type SankeyExtraProperties,
} from "d3-sankey";
import { formatIDR } from "@/lib/utils/formatters";

/**
 * Cashflow sankey — pola Maybe Finance asli.
 *
 *   Income ────┐
 *               ╲
 *   Salary ────  Cash Flow ──── Food
 *               ╱             └── Shopping
 *   Bonus  ────              └── Surplus
 *
 * Source flow (kiri) = pemasukan per kategori → Cash Flow node tengah →
 * outflow per kategori (kanan) + Surplus.
 *
 * Pakai d3-sankey karena Recharts tidak punya layout sankey out of the
 * box. Dependency kecil (~15KB gzip).
 */

export interface SankeyDatum {
  /** Node label (mis. "Gaji", "Makanan & Minuman"). */
  name: string;
  /** Sumbu mana node ini muncul. */
  side: "source" | "target";
  /** Total IDR yang mengalir lewat node ini. */
  value: number;
  /** Hex color untuk node + link yang berasal/menuju ke sini. */
  color: string;
}

export interface CashflowData {
  /** Total uang yang lewat (= total inflow = total outflow + surplus). */
  total: number;
  inflow: SankeyDatum[];
  outflow: SankeyDatum[];
  /** Sisa positif setelah outflow; ditampilkan sebagai node hijau. */
  surplus: number;
}

interface Props {
  data: CashflowData;
  /** Periode aktif (sinkron dengan NetWorthHero), URL param `cashflow_period`. */
  period: "1d" | "7d" | "30d" | "90d" | "ytd" | "365d" | "5y";
}

const PERIOD_OPTIONS: { value: Props["period"]; label: string }[] = [
  { value: "1d", label: "1H" },
  { value: "7d", label: "7H" },
  { value: "30d", label: "30H" },
  { value: "90d", label: "90H" },
  { value: "ytd", label: "YTD" },
  { value: "365d", label: "365H" },
  { value: "5y", label: "5T" },
];

const SUCCESS_COLOR = "#2EA043";
const PRIMARY_BLUE = "#388BFD";

/**
 * Palette biru bertingkat untuk node sankey. Diatur dari paling terang
 * (pemasukan utama) ke paling redup (kategori kecil) supaya visual flow
 * terasa konsisten — bukan mosaik warna acak yang sulit dibaca.
 */
const BLUE_PALETTE = [
  "#388BFD",
  "#1F6FEB",
  "#1158C7",
  "#0D419D",
  "#5896FF",
  "#79B8FF",
  "#A2C8FF",
  "#C8DDFF",
];

interface SankeyNode extends SankeyExtraProperties {
  name: string;
  color: string;
  value: number;
}

interface SankeyLink extends SankeyExtraProperties {
  source: number;
  target: number;
  value: number;
  color: string;
}

export function CashflowSankey({ data, period }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(940);

  // Resize observer — sankey butuh width fixed, jadi kita observe dan
  // re-render saat container berubah (mis. user collapse sidebar).
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setWidth(w);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  function setPeriod(next: Props["period"]) {
    const params = new URLSearchParams(searchParams);
    if (next === "30d") params.delete("cashflow_period");
    else params.set("cashflow_period", next);
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  const hasData = data.inflow.length > 0 || data.outflow.length > 0;

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-foreground">Arus kas</h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Props["period"])}
          disabled={pending}
          className="bg-elevated border border-border text-foreground text-xs font-medium rounded-md px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring/50 hover:border-[#444C56] transition-colors disabled:opacity-50"
          aria-label="Periode arus kas"
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div ref={containerRef} className="w-full">
        {hasData ? (
          <SankeyChart data={data} width={width} height={Math.max(320, data.outflow.length * 40)} />
        ) : (
          <div className="h-64 flex items-center justify-center text-center">
            <div>
              <p className="text-sm font-medium text-foreground">
                Belum cukup data
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tambahkan transaksi untuk melihat arus kas Anda.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SankeyChart({
  data,
  width,
  height,
}: {
  data: CashflowData;
  width: number;
  height: number;
}) {
  // Susun nodes & links dengan index numerik supaya d3-sankey happy.
  // Layout:
  //   inflow nodes (kiri) → "Cash Flow" (tengah) → outflow nodes (kanan)
  //   ditambah "Surplus" node di kanan kalau positif.
  //
  // Color strategy: pakai shade biru dari BLUE_PALETTE secara siklik
  // berdasarkan urutan biggest-first, sehingga node terbesar dapat warna
  // paling kuat. Cash Flow node tengah & Surplus pakai brand blue.

  const inflowColored = data.inflow.map((n, i) => ({
    ...n,
    color: BLUE_PALETTE[i % BLUE_PALETTE.length],
  }));
  const outflowColored = data.outflow.map((n, i) => ({
    ...n,
    color: BLUE_PALETTE[i % BLUE_PALETTE.length],
  }));

  const nodes: SankeyNode[] = [
    { name: "Arus Kas", color: PRIMARY_BLUE, value: data.total },
    ...inflowColored.map((n) => ({ name: n.name, color: n.color, value: n.value })),
    ...outflowColored.map((n) => ({ name: n.name, color: n.color, value: n.value })),
  ];

  if (data.surplus > 0) {
    nodes.push({ name: "Surplus", color: SUCCESS_COLOR, value: data.surplus });
  }

  const links: SankeyLink[] = [];
  let idx = 1;
  // Inflow → Cash Flow (source kiri)
  for (const n of inflowColored) {
    links.push({ source: idx, target: 0, value: n.value, color: n.color });
    idx++;
  }
  // Cash Flow → Outflow (target kanan)
  for (const n of outflowColored) {
    links.push({ source: 0, target: idx, value: n.value, color: n.color });
    idx++;
  }
  // Cash Flow → Surplus (kalau ada)
  if (data.surplus > 0) {
    links.push({
      source: 0,
      target: idx,
      value: data.surplus,
      color: SUCCESS_COLOR,
    });
  }

  const gen = sankey<SankeyNode, SankeyLink>()
    .nodeWidth(14)
    .nodePadding(20)
    .extent([
      [120, 8],
      [Math.max(width, 600) - 120, height - 8],
    ]);

  const graph = gen({
    nodes: nodes.map((n) => ({ ...n })),
    links: links.map((l) => ({ ...l })),
  });

  const linkPath = sankeyLinkHorizontal<SankeyNode, SankeyLink>();

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${Math.max(width, 600)} ${height}`}>
      <defs>
        {graph.links.map((link, i) => {
          const src = link.source as SankeyNode & { x1?: number };
          const tgt = link.target as SankeyNode & { x0?: number };
          return (
            <linearGradient
              key={`grad-${i}`}
              id={`sankey-grad-${i}`}
              gradientUnits="userSpaceOnUse"
              x1={src.x1 ?? 0}
              x2={tgt.x0 ?? 0}
            >
              <stop
                offset="0%"
                stopColor={(link.source as SankeyNode).color}
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor={(link.target as SankeyNode).color}
                stopOpacity={0.35}
              />
            </linearGradient>
          );
        })}
      </defs>

      {/* Links */}
      <g fill="none">
        {graph.links.map((link, i) => (
          <path
            key={`link-${i}`}
            d={linkPath(link) ?? ""}
            stroke={`url(#sankey-grad-${i})`}
            strokeWidth={Math.max(1, link.width ?? 1)}
            opacity={0.8}
          >
            <title>
              {(link.source as SankeyNode).name} →{" "}
              {(link.target as SankeyNode).name}: {formatIDR(link.value)}
            </title>
          </path>
        ))}
      </g>

      {/* Nodes */}
      <g>
        {graph.nodes.map((n, i) => {
          const x0 = n.x0 ?? 0;
          const x1 = n.x1 ?? 0;
          const y0 = n.y0 ?? 0;
          const y1 = n.y1 ?? 0;
          const w = x1 - x0;
          const h = y1 - y0;
          const isLeft = x0 < width / 2;
          const labelX = isLeft ? x1 + 8 : x0 - 8;
          const anchor = isLeft ? "start" : "end";

          return (
            <g key={`node-${i}`}>
              <rect
                x={x0}
                y={y0}
                width={Math.max(2, w)}
                height={Math.max(2, h)}
                fill={n.color}
                rx={3}
              >
                <title>
                  {n.name}: {formatIDR(n.value ?? 0)}
                </title>
              </rect>
              <text
                x={labelX}
                y={(y0 + y1) / 2}
                dy="-0.2em"
                textAnchor={anchor}
                className="fill-foreground"
                style={{ fontSize: 11, fontWeight: 500 }}
              >
                {n.name}
              </text>
              <text
                x={labelX}
                y={(y0 + y1) / 2}
                dy="1em"
                textAnchor={anchor}
                className="fill-muted-foreground font-mono"
                style={{ fontSize: 10 }}
              >
                {formatIDR(n.value ?? 0)}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
