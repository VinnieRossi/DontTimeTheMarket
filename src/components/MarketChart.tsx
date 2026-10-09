"use client";

import {
  createChart,
  createSeriesMarkers,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

/** Arbitrary fixed epoch used only to give lightweight-charts a real
 * timestamp to plot against. Elapsed day N is always rendered as
 * BASE_TIMESTAMP + N days; the calendar date this actually lands on is
 * never shown anywhere in the UI, which keeps the real run dates hidden
 * from the player so they cannot recognize the historical period (e.g.
 * 2008 or 2020) and play to the outcome they already know happened. */
const BASE_TIMESTAMP = Date.UTC(2000, 0, 3) / 1000;
const SECONDS_PER_DAY = 86400;

function dayToTime(day: number): UTCTimestamp {
  return (BASE_TIMESTAMP + day * SECONDS_PER_DAY) as UTCTimestamp;
}

function timeToDay(time: number): number {
  return Math.round((time - BASE_TIMESTAMP) / SECONDS_PER_DAY);
}

export interface ChartLine {
  id: string;
  color: string;
  lineWidth?: 1 | 2 | 3 | 4;
  lineStyle?: "solid" | "dashed";
  data: { day: number; value: number }[];
}

export interface ChartMarker {
  day: number;
  value: number;
  side: "buy" | "sell";
}

export interface MarketChartProps {
  lines: ChartLine[];
  markers?: ChartMarker[];
  height?: number;
}

export function MarketChart({ lines, markers = [], height = 300 }: MarketChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const seriesMap = seriesRef.current;

    const chart = createChart(container, {
      height,
      layout: {
        background: { color: "transparent" },
        textColor: "#5b7186",
        fontFamily: "var(--font-body), system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#e3ecf3" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        rightOffset: 4,
        tickMarkFormatter: (time: number) => `Day ${timeToDay(time) + 1}`,
      },
      crosshair: { mode: 0 },
    });
    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesMap.clear();
      markersPluginRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const activeIds = new Set(lines.map((l) => l.id));
    for (const [id, series] of seriesRef.current.entries()) {
      if (!activeIds.has(id)) {
        chart.removeSeries(series);
        seriesRef.current.delete(id);
      }
    }

    for (const line of lines) {
      let series = seriesRef.current.get(line.id);
      if (!series) {
        series = chart.addSeries(LineSeries, {
          color: line.color,
          lineWidth: line.lineWidth ?? 2,
          lineStyle: line.lineStyle === "dashed" ? 2 : 0,
          priceLineVisible: false,
          lastValueVisible: line.id === "player",
        });
        seriesRef.current.set(line.id, series);
      }
      series.setData(
        line.data.map((p) => ({ time: dayToTime(p.day), value: p.value })),
      );

      if (line.id === "player") {
        const markersPlugin =
          markersPluginRef.current ?? createSeriesMarkers(series, []);
        markersPluginRef.current = markersPlugin;
        markersPlugin.setMarkers(
          markers.map((m) => ({
            time: dayToTime(m.day),
            position: m.side === "buy" ? "belowBar" : "aboveBar",
            color: m.side === "buy" ? "#1b9e6b" : "#e0493f",
            shape: m.side === "buy" ? "arrowUp" : "arrowDown",
            text: m.side === "buy" ? "Buy" : "Sell",
          })),
        );
      }
    }

    chart.timeScale().fitContent();
  }, [lines, markers]);

  return <div ref={containerRef} className="w-full" />;
}
