/**
 * LineChart Component
 * ────────────────────
 * Reusable Recharts area/line chart for time-series and trend data.
 * Used for: AFI Trend, Historical Fare Trend, Fare & Index Trajectory.
 *
 * Props:
 *   data       — Array of data points
 *   xKey       — Key for the x-axis labels
 *   lines      — Array of { key: string, color: string, name: string }
 *   height     — Chart height in px (default 220)
 *   formatY    — Function to format Y-axis tick values
 *   formatTooltipValue — Function to format tooltip values
 */

import React from 'react';
import {
  AreaChart,
  Area,
  LineChart as RechartsLine,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

function CustomTooltip({ active, payload, label, formatTooltipValue }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: 'var(--bg-surface, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: '0.5rem',
        padding: '0.5rem 0.875rem',
        fontSize: '0.8rem',
        color: 'var(--text-primary, #f1f5f9)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        minWidth: '140px',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary, #94a3b8)' }}>
        {label}
      </div>
      {payload.map((entry) => (
        <div
          key={entry.dataKey}
          style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.15rem' }}
        >
          <span style={{ color: entry.color, fontSize: '0.78rem' }}>{entry.name}</span>
          <span style={{ fontWeight: 700 }}>
            {formatTooltipValue ? formatTooltipValue(entry.value, entry.dataKey) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function CustomLegend({ payload }) {
  if (!payload) return null;
  return (
    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.25rem', flexWrap: 'wrap' }}>
      {payload.map((entry) => (
        <span key={entry.value} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>
          <span style={{ width: 10, height: 3, borderRadius: 2, background: entry.color, display: 'inline-block' }} />
          {entry.value}
        </span>
      ))}
    </div>
  );
}

export default function LineChart({
  data = [],
  xKey = 'label',
  lines = [],
  height = 220,
  formatY,
  formatTooltipValue,
  area = true,
  showLegend = false,
}) {
  if (!data || data.length === 0) return null;

  const Chart = area ? AreaChart : RechartsLine;
  const DataEl = area ? Area : Line;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <defs>
          {lines.map((line) => (
            <linearGradient key={`grad-${line.key}`} id={`grad-${line.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={line.color} stopOpacity={0.18} />
              <stop offset="95%" stopColor={line.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border-color, rgba(51,65,85,0.5))"
          vertical={false}
        />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: 'var(--text-secondary, #94a3b8)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--text-tertiary, #64748b)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatY || ((v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v)))}
          width={42}
        />
        <Tooltip
          content={<CustomTooltip formatTooltipValue={formatTooltipValue} />}
          cursor={{ stroke: 'var(--border-color, #334155)', strokeWidth: 1, strokeDasharray: '4 2' }}
        />
        {showLegend && <Legend content={<CustomLegend />} />}
        {lines.map((line) =>
          area ? (
            <Area
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name || line.key}
              stroke={line.color}
              strokeWidth={2}
              fill={`url(#grad-${line.key})`}
              dot={{ r: 4, fill: line.color, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: line.color }}
              connectNulls={false}
            />
          ) : (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name || line.key}
              stroke={line.color}
              strokeWidth={2}
              dot={{ r: 4, fill: line.color, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          )
        )}
      </Chart>
    </ResponsiveContainer>
  );
}
