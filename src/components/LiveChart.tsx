/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";

interface LiveChartProps {
  currentAqi: number;
}

export default function LiveChart({ currentAqi }: LiveChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ hour: number; value: number } | null>(null);

  // Robust parsing to prevent NaN in baseline calculations
  const safeAqi = typeof currentAqi === "number" && !isNaN(currentAqi) ? currentAqi : 33;

  // Generate a smooth simulated 24h curve peaking around Hour 8
  const baseline = Math.max(25, safeAqi);
  const dataPoints = [
    { hour: 0, val: Math.round(baseline * 0.9) },
    { hour: 2, val: Math.round(baseline * 0.95) },
    { hour: 4, val: Math.round(baseline * 1.05) },
    { hour: 6, val: Math.round(baseline * 1.25) },
    { hour: 8, val: Math.round(baseline * 1.36) }, // Peak at 8h
    { hour: 10, val: Math.round(baseline * 1.2) },
    { hour: 12, val: Math.round(baseline * 1.0) },
    { hour: 14, val: Math.round(baseline * 0.95) },
    { hour: 16, val: Math.round(baseline * 1.1) },
    { hour: 18, val: Math.round(baseline * 1.15) },
    { hour: 20, val: Math.round(baseline * 1.02) },
    { hour: 22, val: Math.round(baseline * 0.9) },
    { hour: 24, val: Math.round(baseline * 0.85) }
  ];

  const peakPoint = dataPoints.reduce((max, p) => (p.val > max.val ? p : max), dataPoints[0]);

  // Dimensions for the SVG
  const width = 800;
  const height = 140;
  const paddingX = 40;
  const paddingY = 20;

  // Scale functions
  const getX = (hour: number) => paddingX + (hour / 24) * (width - paddingX * 2);
  const maxVal = Math.max(...dataPoints.map(d => d.val)) * 1.2;
  const getY = (val: number) => height - paddingY - (val / maxVal) * (height - paddingY * 2);

  // Generate SVG path (Cubic Bezier curve for smoothness)
  let pathD = "";
  for (let i = 0; i < dataPoints.length; i++) {
    const p = dataPoints[i];
    const x = getX(p.hour);
    const y = getY(p.val);
    if (i === 0) {
      pathD += `M ${x} ${y}`;
    } else {
      const prev = dataPoints[i - 1];
      const prevX = getX(prev.hour);
      const prevY = getY(prev.val);
      const cpX1 = prevX + (x - prevX) / 2;
      const cpY1 = prevY;
      const cpX2 = prevX + (x - prevX) / 2;
      const cpY2 = y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${x} ${y}`;
    }
  }

  // Gradient area path
  const areaD = `${pathD} L ${getX(24)} ${height - paddingY} L ${getX(0)} ${height - paddingY} Z`;

  return (
    <div id="aqi-forecast-chart" className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-xs mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-medium text-slate-500 text-xs tracking-wider uppercase flex items-center gap-2">
          📊 24-Hour Air Quality Index (AQI) Forecast
        </h3>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
          Interval: 2-Hour Steps
        </span>
      </div>

      <div className="relative w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[600px] h-[160px] relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines (using safe alpha values for light mode compatibility) */}
            <line x1={paddingX} y1={getY(25)} x2={width - paddingX} y2={getY(25)} stroke="rgba(150, 150, 150, 0.15)" strokeDasharray="3,3" />
            <line x1={paddingX} y1={getY(50)} x2={width - paddingX} y2={getY(50)} stroke="rgba(150, 150, 150, 0.15)" strokeDasharray="3,3" />
            <line x1={paddingX} y1={getY(100)} x2={width - paddingX} y2={getY(100)} stroke="rgba(150, 150, 150, 0.15)" strokeDasharray="3,3" />

            {/* Area under the curve */}
            <path d={areaD} fill="url(#chart-gradient)" />

            {/* Main line */}
            <path d={pathD} fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />

            {/* Peak indicator */}
            <g>
              <circle
                cx={getX(peakPoint.hour)}
                cy={getY(peakPoint.val)}
                r="5"
                fill="#EF4444"
                stroke="#fff"
                strokeWidth="2"
                className="animate-pulse"
              />
              {/* Peak Tooltip Card */}
              <foreignObject
                x={getX(peakPoint.hour) - 50}
                y={getY(peakPoint.val) - 36}
                width="100"
                height="32"
              >
                <div className="bg-white border border-red-200 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center justify-center gap-1 whitespace-nowrap">
                  📈 Peak {peakPoint.val} (H{peakPoint.hour})
                </div>
              </foreignObject>
            </g>

            {/* Hovered point */}
            {hoveredPoint && (
              <g>
                <line
                  x1={getX(hoveredPoint.hour)}
                  y1={paddingY}
                  x2={getX(hoveredPoint.hour)}
                  y2={height - paddingY}
                  stroke="rgba(150, 150, 150, 0.3)"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <circle
                  cx={getX(hoveredPoint.hour)}
                  cy={getY(hoveredPoint.value)}
                  r="6"
                  fill="#4F46E5"
                  stroke="#fff"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Invisible hover zones */}
            {dataPoints.map((p, idx) => (
              <circle
                key={idx}
                cx={getX(p.hour)}
                cy={getY(p.val)}
                r="15"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint({ hour: p.hour, value: p.val })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            ))}

            {/* X-axis indicators */}
            {[0, 4, 8, 12, 16, 20, 24].map(h => (
              <g key={h}>
                <line
                  x1={getX(h)}
                  y1={height - paddingY}
                  x2={getX(h)}
                  y2={height - paddingY + 4}
                  stroke="rgba(150, 150, 150, 0.25)"
                />
                <text
                  x={getX(h)}
                  y={height - paddingY + 16}
                  textAnchor="middle"
                  className="fill-slate-400 text-[9px] font-mono"
                >
                  {h}h
                </text>
              </g>
            ))}
          </svg>

          {/* Hover Info HUD */}
          {hoveredPoint && (
            <div
              className="absolute bg-slate-900 text-white text-[10px] font-mono px-2 py-1 rounded shadow-md pointer-events-none z-10 transition-all duration-75 border border-slate-200"
              style={{
                left: `${getX(hoveredPoint.hour) - 40}px`,
                top: `${getY(hoveredPoint.value) - 45}px`
              }}
            >
              Time: {hoveredPoint.hour}:00
              <br />
              Est. AQI: {hoveredPoint.value}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
