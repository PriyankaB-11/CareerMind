"use client";

import { useEffect, useRef, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RadarPoint {
  dimension: string;
  score: number;
}

export function CareerRadar({ data }: { data: RadarPoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const updateReady = () => {
      const rect = node.getBoundingClientRect();
      setReady(rect.width > 0 && rect.height > 0);
    };

    updateReady();

    const observer = new ResizeObserver(() => updateReady());
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
          {ready ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
              <RadarChart data={data} outerRadius="70%">
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: "#334155", fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value}`, "Score"]} />
                <Radar dataKey="score" stroke="#0891b2" fill="#22d3ee" fillOpacity={0.45} />
              </RadarChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
