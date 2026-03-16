'use client'

import React from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BarConfig {
  type: 'bar'
  title?: string
  xLabel?: string
  yLabel?: string
  data: { label: string; value: number }[]
}

interface LineSeries {
  label: string
  color: string
  points: [number, number][]
}

interface LineConfig {
  type: 'line'
  title?: string
  xLabel?: string
  yLabel?: string
  series: LineSeries[]
}

interface PieSlice {
  label: string
  value: number
  color: string
}

interface PieConfig {
  type: 'pie'
  title?: string
  data: PieSlice[]
}

interface CoordinatePlot {
  type: 'line' | 'points' | 'curve'
  label?: string
  color: string
  points: [number, number][]
}

interface CoordinateConfig {
  type: 'coordinate'
  title?: string
  xRange: [number, number]
  yRange: [number, number]
  plots: CoordinatePlot[]
}

interface NumberLineConfig {
  type: 'numberline'
  min: number
  max: number
  marked?: number[]
  labels?: Record<string, string>
}

type ChartConfig = BarConfig | LineConfig | PieConfig | CoordinateConfig | NumberLineConfig

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({ cfg }: { cfg: BarConfig }) {
  const W = 480, H = 300
  const left = 60, right = 440, top = 20, bottom = 230
  const chartW = right - left
  const chartH = bottom - top

  const values = cfg.data.map((d) => d.value)
  const maxVal = Math.max(...values, 0)
  // Nice round ceiling
  const rawStep = maxVal / 5 || 1
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const niceStep = Math.ceil(rawStep / magnitude) * magnitude
  const yMax = niceStep * 5

  const barCount = cfg.data.length
  const gap = chartW / barCount
  const barW = gap * 0.55

  const yTicks = Array.from({ length: 6 }, (_, i) => i * niceStep)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" fontFamily="sans-serif" fontSize="11">
      {/* Title */}
      {cfg.title && (
        <text x={W / 2} y={14} textAnchor="middle" fontWeight="bold" fontSize="13" fill="#1f2937">
          {cfg.title}
        </text>
      )}

      {/* Y axis ticks + gridlines */}
      {yTicks.map((tick) => {
        const y = bottom - (tick / yMax) * chartH
        return (
          <g key={tick}>
            <line x1={left - 4} y1={y} x2={right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={left - 8} y={y + 4} textAnchor="end" fill="#6b7280" fontSize="10">
              {tick}
            </text>
          </g>
        )
      })}

      {/* Axes */}
      <line x1={left} y1={top} x2={left} y2={bottom} stroke="#374151" strokeWidth="1.5" />
      <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#374151" strokeWidth="1.5" />

      {/* Y axis label */}
      {cfg.yLabel && (
        <text
          x={-((top + bottom) / 2)}
          y={14}
          textAnchor="middle"
          transform="rotate(-90)"
          fill="#374151"
          fontSize="11"
        >
          {cfg.yLabel}
        </text>
      )}

      {/* X axis label */}
      {cfg.xLabel && (
        <text x={(left + right) / 2} y={H - 4} textAnchor="middle" fill="#374151" fontSize="11">
          {cfg.xLabel}
        </text>
      )}

      {/* Bars */}
      {cfg.data.map((d, i) => {
        const x = left + i * gap + gap / 2 - barW / 2
        const barH = (d.value / yMax) * chartH
        const y = bottom - barH
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill="#f97316" rx="2" />
            {/* Value label above bar */}
            <text x={x + barW / 2} y={y - 3} textAnchor="middle" fill="#374151" fontSize="10">
              {d.value}
            </text>
            {/* X tick label */}
            <text x={x + barW / 2} y={bottom + 14} textAnchor="middle" fill="#6b7280" fontSize="10">
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Line Chart ───────────────────────────────────────────────────────────────

function LineChart({ cfg }: { cfg: LineConfig }) {
  const W = 480, H = 300
  const left = 60, right = 400, top = 30, bottom = 240

  // Gather all points for domain computation
  const allX = cfg.series.flatMap((s) => s.points.map((p) => p[0]))
  const allY = cfg.series.flatMap((s) => s.points.map((p) => p[1]))
  const xMin = Math.min(...allX)
  const xMax = Math.max(...allX)
  const yMin = Math.min(...allY)
  const yMax = Math.max(...allY)
  const xRange = xMax - xMin || 1
  const yRange = yMax - yMin || 1
  const chartW = right - left
  const chartH = bottom - top

  const toSVG = (x: number, y: number) => ({
    sx: left + ((x - xMin) / xRange) * chartW,
    sy: bottom - ((y - yMin) / yRange) * chartH,
  })

  // Generate axis ticks (up to 6)
  const xTickCount = Math.min(6, allX.length)
  const xStep = xRange / (xTickCount - 1 || 1)
  const xTicks = Array.from({ length: xTickCount }, (_, i) => xMin + i * xStep)

  const yTickCount = 6
  const yStep = yRange / (yTickCount - 1)
  const yTicks = Array.from({ length: yTickCount }, (_, i) => yMin + i * yStep)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" fontFamily="sans-serif" fontSize="11">
      {/* Title */}
      {cfg.title && (
        <text x={(left + right) / 2} y={16} textAnchor="middle" fontWeight="bold" fontSize="13" fill="#1f2937">
          {cfg.title}
        </text>
      )}

      {/* Grid + Y ticks */}
      {yTicks.map((tick, i) => {
        const { sy } = toSVG(xMin, tick)
        const label = Number.isInteger(tick) ? tick : tick.toFixed(1)
        return (
          <g key={i}>
            <line x1={left} y1={sy} x2={right} y2={sy} stroke="#e5e7eb" strokeWidth="1" />
            <text x={left - 6} y={sy + 4} textAnchor="end" fill="#6b7280" fontSize="10">
              {label}
            </text>
          </g>
        )
      })}

      {/* X ticks */}
      {xTicks.map((tick, i) => {
        const { sx } = toSVG(tick, yMin)
        const label = Number.isInteger(tick) ? tick : tick.toFixed(1)
        return (
          <g key={i}>
            <line x1={sx} y1={bottom} x2={sx} y2={bottom + 4} stroke="#374151" strokeWidth="1" />
            <text x={sx} y={bottom + 14} textAnchor="middle" fill="#6b7280" fontSize="10">
              {label}
            </text>
          </g>
        )
      })}

      {/* Axes */}
      <line x1={left} y1={top} x2={left} y2={bottom} stroke="#374151" strokeWidth="1.5" />
      <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#374151" strokeWidth="1.5" />

      {/* Labels */}
      {cfg.yLabel && (
        <text x={-(top + bottom) / 2} y={14} textAnchor="middle" transform="rotate(-90)" fill="#374151" fontSize="11">
          {cfg.yLabel}
        </text>
      )}
      {cfg.xLabel && (
        <text x={(left + right) / 2} y={H - 2} textAnchor="middle" fill="#374151" fontSize="11">
          {cfg.xLabel}
        </text>
      )}

      {/* Series */}
      {cfg.series.map((s, si) => {
        const svgPoints = s.points.map((p) => toSVG(p[0], p[1]))
        const pathD = svgPoints
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.sx.toFixed(1)} ${p.sy.toFixed(1)}`)
          .join(' ')
        return (
          <g key={si}>
            <path d={pathD} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
            {svgPoints.map((p, pi) => (
              <circle key={pi} cx={p.sx} cy={p.sy} r="3.5" fill={s.color} />
            ))}
          </g>
        )
      })}

      {/* Legend */}
      {cfg.series.map((s, si) => (
        <g key={si} transform={`translate(${right + 8}, ${top + si * 20})`}>
          <line x1={0} y1={6} x2={16} y2={6} stroke={s.color} strokeWidth="2" />
          <circle cx="8" cy="6" r="3" fill={s.color} />
          <text x={20} y={10} fill="#374151" fontSize="10">
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ─── Pie Chart ────────────────────────────────────────────────────────────────

function PieChart({ cfg }: { cfg: PieConfig }) {
  const W = 480, H = 300
  const cx = 170, cy = 150, r = 110

  const total = cfg.data.reduce((s, d) => s + d.value, 0) || 1

  // Compute slices
  let angle = -Math.PI / 2
  const slices = cfg.data.map((d) => {
    const sweep = (d.value / total) * 2 * Math.PI
    const start = angle
    const end = angle + sweep
    angle = end
    return { ...d, start, end, sweep }
  })

  const describeArc = (start: number, end: number) => {
    const x1 = cx + r * Math.cos(start)
    const y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)
    const large = end - start > Math.PI ? 1 : 0
    return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" fontFamily="sans-serif" fontSize="11">
      {/* Title */}
      {cfg.title && (
        <text x={cx} y={16} textAnchor="middle" fontWeight="bold" fontSize="13" fill="#1f2937">
          {cfg.title}
        </text>
      )}

      {/* Slices */}
      {slices.map((s, i) => {
        const midAngle = (s.start + s.end) / 2
        const pct = ((s.value / total) * 100).toFixed(0)
        const labelR = r * 0.65
        const lx = cx + labelR * Math.cos(midAngle)
        const ly = cy + labelR * Math.sin(midAngle)
        return (
          <g key={i}>
            <path d={describeArc(s.start, s.end)} fill={s.color} stroke="#fff" strokeWidth="1.5" />
            {s.sweep > 0.17 && ( // only label if slice > ~10%
              <text x={lx.toFixed(1)} y={ly.toFixed(1)} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontWeight="bold" fontSize="10">
                {pct}%
              </text>
            )}
          </g>
        )
      })}

      {/* Legend */}
      {cfg.data.map((d, i) => (
        <g key={i} transform={`translate(300, ${40 + i * 22})`}>
          <rect x={0} y={0} width={14} height={14} fill={d.color} rx="2" />
          <text x={20} y={11} fill="#374151" fontSize="11">
            {d.label} ({d.value})
          </text>
        </g>
      ))}
    </svg>
  )
}

// ─── Coordinate Chart ─────────────────────────────────────────────────────────

function CoordinateChart({ cfg }: { cfg: CoordinateConfig }) {
  const W = 480, H = 300
  const left = 50, right = 440, top = 20, bottom = 270
  const chartW = right - left
  const chartH = bottom - top

  const [xMin, xMax] = cfg.xRange
  const [yMin, yMax] = cfg.yRange
  const xRange = xMax - xMin || 1
  const yRange = yMax - yMin || 1

  const toSVG = (x: number, y: number) => ({
    sx: left + ((x - xMin) / xRange) * chartW,
    sy: top + ((yMax - y) / yRange) * chartH,
  })

  const originX = left + ((-xMin) / xRange) * chartW
  const originY = top + (yMax / yRange) * chartH

  // Grid lines at integer ticks
  const xTicks: number[] = []
  for (let x = Math.ceil(xMin); x <= xMax; x++) xTicks.push(x)
  const yTicks: number[] = []
  for (let y = Math.ceil(yMin); y <= yMax; y++) yTicks.push(y)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" fontFamily="sans-serif" fontSize="10">
      {/* Title */}
      {cfg.title && (
        <text x={W / 2} y={14} textAnchor="middle" fontWeight="bold" fontSize="13" fill="#1f2937">
          {cfg.title}
        </text>
      )}

      {/* Grid */}
      {xTicks.map((x) => {
        const { sx } = toSVG(x, yMin)
        return <line key={`gx${x}`} x1={sx} y1={top} x2={sx} y2={bottom} stroke={x === 0 ? '#9ca3af' : '#e5e7eb'} strokeWidth={x === 0 ? 1 : 0.75} />
      })}
      {yTicks.map((y) => {
        const { sy } = toSVG(xMin, y)
        return <line key={`gy${y}`} x1={left} y1={sy} x2={right} y2={sy} stroke={y === 0 ? '#9ca3af' : '#e5e7eb'} strokeWidth={y === 0 ? 1 : 0.75} />
      })}

      {/* X axis with arrow */}
      <line x1={left} y1={originY} x2={right - 4} y2={originY} stroke="#374151" strokeWidth="1.5" markerEnd="url(#arrowX)" />
      {/* Y axis with arrow */}
      <line x1={originX} y1={bottom} x2={originX} y2={top + 4} stroke="#374151" strokeWidth="1.5" markerEnd="url(#arrowY)" />

      {/* Arrow markers */}
      <defs>
        <marker id="arrowX" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#374151" />
        </marker>
        <marker id="arrowY" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,6 L3,0 L6,6 Z" fill="#374151" />
        </marker>
      </defs>

      {/* Axis labels */}
      <text x={right + 4} y={originY + 4} fill="#374151" fontSize="11" fontStyle="italic">x</text>
      <text x={originX + 4} y={top + 2} fill="#374151" fontSize="11" fontStyle="italic">y</text>

      {/* Tick labels */}
      {xTicks.filter((x) => x !== 0).map((x) => {
        const { sx } = toSVG(x, 0)
        return (
          <g key={`xl${x}`}>
            <line x1={sx} y1={originY - 3} x2={sx} y2={originY + 3} stroke="#374151" strokeWidth="1" />
            <text x={sx} y={originY + 12} textAnchor="middle" fill="#6b7280" fontSize="9">{x}</text>
          </g>
        )
      })}
      {yTicks.filter((y) => y !== 0).map((y) => {
        const { sy } = toSVG(0, y)
        return (
          <g key={`yl${y}`}>
            <line x1={originX - 3} y1={sy} x2={originX + 3} y2={sy} stroke="#374151" strokeWidth="1" />
            <text x={originX - 6} y={sy + 4} textAnchor="end" fill="#6b7280" fontSize="9">{y}</text>
          </g>
        )
      })}

      {/* Plots */}
      {cfg.plots.map((plot, pi) => {
        const svgPts = plot.points.map((p) => toSVG(p[0], p[1]))
        if (plot.type === 'points') {
          return (
            <g key={pi}>
              {svgPts.map((p, i) => (
                <g key={i}>
                  <circle cx={p.sx} cy={p.sy} r="4" fill={plot.color} />
                  {plot.label && (
                    <text x={p.sx + 6} y={p.sy - 4} fill={plot.color} fontSize="10" fontWeight="bold">
                      {plot.label}
                    </text>
                  )}
                </g>
              ))}
            </g>
          )
        }
        // line or curve — connect all points
        const pathD = svgPts
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.sx.toFixed(1)} ${p.sy.toFixed(1)}`)
          .join(' ')
        return (
          <g key={pi}>
            <path d={pathD} fill="none" stroke={plot.color} strokeWidth="2" strokeLinejoin="round" />
          </g>
        )
      })}

      {/* Legend */}
      {cfg.plots.filter((p) => p.label).map((plot, pi) => (
        <g key={pi} transform={`translate(${right - 120}, ${top + 4 + pi * 16})`}>
          <line x1={0} y1={6} x2={14} y2={6} stroke={plot.color} strokeWidth="2" />
          <text x={18} y={10} fill="#374151" fontSize="10">{plot.label}</text>
        </g>
      ))}
    </svg>
  )
}

// ─── Number Line ──────────────────────────────────────────────────────────────

function NumberLine({ cfg }: { cfg: NumberLineConfig }) {
  const W = 480, H = 120
  const left = 40, right = 440, midY = 60
  const range = cfg.max - cfg.min || 1
  const chartW = right - left

  const toX = (v: number) => left + ((v - cfg.min) / range) * chartW

  const ticks: number[] = []
  for (let v = cfg.min; v <= cfg.max; v++) ticks.push(v)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" fontFamily="sans-serif" fontSize="11">
      {/* Main line with arrows */}
      <defs>
        <marker id="arrowR" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#374151" />
        </marker>
        <marker id="arrowL" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
          <path d="M0,0 L6,3 L0,6 Z" fill="#374151" />
        </marker>
      </defs>
      <line x1={left - 10} y1={midY} x2={right + 10} y2={midY} stroke="#374151" strokeWidth="1.5" markerEnd="url(#arrowR)" markerStart="url(#arrowL)" />

      {/* Ticks */}
      {ticks.map((v) => {
        const x = toX(v)
        const isMarked = cfg.marked?.includes(v)
        return (
          <g key={v}>
            <line x1={x} y1={midY - 6} x2={x} y2={midY + 6} stroke="#374151" strokeWidth={isMarked ? 2 : 1} />
            {isMarked && <circle cx={x} cy={midY} r="6" fill="#f97316" />}
            <text x={x} y={midY + 20} textAnchor="middle" fill={isMarked ? '#ea580c' : '#6b7280'} fontWeight={isMarked ? 'bold' : 'normal'} fontSize="10">
              {v}
            </text>
            {/* Custom label above */}
            {cfg.labels?.[String(v)] && (
              <text x={x} y={midY - 14} textAnchor="middle" fill="#1f2937" fontWeight="bold" fontSize="11">
                {cfg.labels[String(v)]}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ChartDiagram({ code }: { code: string }) {
  let cfg: ChartConfig

  try {
    cfg = JSON.parse(code) as ChartConfig
  } catch {
    // Fallback: show the raw code in a pre block
    return (
      <pre className="my-4 overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        {code}
      </pre>
    )
  }

  if (!cfg || !cfg.type) {
    return (
      <pre className="my-4 overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        {code}
      </pre>
    )
  }

  const renderChart = () => {
    switch (cfg.type) {
      case 'bar':
        return <BarChart cfg={cfg as BarConfig} />
      case 'line':
        return <LineChart cfg={cfg as LineConfig} />
      case 'pie':
        return <PieChart cfg={cfg as PieConfig} />
      case 'coordinate':
        return <CoordinateChart cfg={cfg as CoordinateConfig} />
      case 'numberline':
        return <NumberLine cfg={cfg as NumberLineConfig} />
      default:
        return (
          <pre className="text-xs text-gray-500">
            Unknown chart type: {(cfg as ChartConfig).type}
          </pre>
        )
    }
  }

  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      {renderChart()}
    </div>
  )
}
