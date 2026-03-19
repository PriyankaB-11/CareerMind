"use client";

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
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Career DNA</CardTitle>
        <CardDescription>Real-time score from your persisted profile data</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
      <div className="h-[320px] min-w-0 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="#cbd5e1" />
            <PolarAngleAxis dataKey="dimension" tick={{ fill: "#334155", fontSize: 12 }} />
            <Tooltip formatter={(value) => [`${value}`, "Score"]} />
            <Radar dataKey="score" stroke="#0891b2" fill="#22d3ee" fillOpacity={0.45} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      </CardContent>
    </Card>
  );
}
