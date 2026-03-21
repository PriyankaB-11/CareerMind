"use client";

import { useEffect, useRef, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RadarPoint {
  dimension: string;
  score: number;
}

export function CareerRadar({ data }: { data: RadarPoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setSize({
        width: Math.max(0, Math.floor(rect.width)),
        height: Math.max(0, Math.floor(rect.height)),
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Career DNA</CardTitle>
        <CardDescription>Real-time score from your persisted profile data</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        <div ref={containerRef} className="h-[320px] min-w-0 w-full">
          {size.width > 0 && size.height > 0 ? (
            <RadarChart
              width={Math.max(280, size.width)}
              height={Math.max(280, size.height)}
              data={data}
              outerRadius="70%"
            >
              <PolarGrid stroke="#cbd5e1" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: "#334155", fontSize: 12 }} />
              <Tooltip formatter={(value) => [`${value}`, "Score"]} />
              <Radar dataKey="score" stroke="#0891b2" fill="#22d3ee" fillOpacity={0.45} />
            </RadarChart>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
