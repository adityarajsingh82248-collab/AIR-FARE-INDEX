/**
 * BarChart Component
 * ───────────────────
 * Reusable Recharts bar chart for displaying categorical data.
 * Used for: Route Performance, Airline Performance, Corridor Fare Sample.
 *
 * Props:
 *   data       — Array of { [xKey]: string, [yKey]: number }
 *   xKey       — Key for the x-axis categorical labels
 *   yKey       — Key for the bar values
 *   yLabel     — Y-axis label text
 *   color      — Bar fill color (CSS color or var())
 *   formatValue — Function to format tooltip/label values
 *   height     — Chart height in px (default 220)
 */

import React from 'react';
import {
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const DEFAULT_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
];

function defaultFormat(value) {
  if (value == null) return '—';
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return `₹${Math.round(value)}`;
}

function CustomTooltip({ active, payload, label, formatValue }) {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0]?.value;
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
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-secondary, #94a3b8)' }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
        {formatValue ? formatValue(val) : defaultFormat(val)}
      </div>
    </div>
  );
}

export default function BarChart({
  data = [],
  xKey = 'label',
  yKey = 'value',
  yLabel,
  color,
  formatValue,
  height = 220,
  multiColor = false,
}) {
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBar
        data={data}
        margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
      >
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
          tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
          width={42}
          label={
            yLabel
              ? {
                  value: yLabel,
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 10, fill: 'var(--text-tertiary, #64748b)' },
                }
              : undefined
          }
        />
        <Tooltip
          content={<CustomTooltip formatValue={formatValue} />}
          cursor={{ fill: 'rgba(59,130,246,0.08)' }}
        />
        <Bar dataKey={yKey} radius={[4, 4, 0, 0]} maxBarSize={52}>
          {multiColor
            ? data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
              ))
            : data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={color || '#3b82f6'} />
              ))}
        </Bar>
      </RechartsBar>
    </ResponsiveContainer>
  );
}
