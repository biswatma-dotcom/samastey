'use client'

import { useEffect, useRef, useState } from 'react'

let mermaidInitialized = false

async function getMermaid() {
  const m = await import('mermaid')
  if (!mermaidInitialized) {
    m.default.initialize({
      startOnLoad: false,
      theme: 'neutral',
      fontFamily: 'inherit',
      fontSize: 14,
    })
    mermaidInitialized = true
  }
  return m.default
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    if (!chart.trim()) return
    let cancelled = false

    async function render() {
      try {
        const mermaid = await getMermaid()
        // Validate first — parse() throws on invalid syntax
        await mermaid.parse(chart.trim())
        const id = `mermaid-${Math.random().toString(36).slice(2)}`
        const { svg } = await mermaid.render(id, chart.trim())
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg
          setRendered(true)
          setError(null)
        }
      } catch (e: any) {
        if (!cancelled) {
          setError('invalid')
        }
      }
    }

    render()
    return () => { cancelled = true }
  }, [chart])

  if (error) {
    // Fallback: show as plain code block
    return (
      <pre className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 text-xs overflow-x-auto">
        <code>{chart}</code>
      </pre>
    )
  }

  return (
    <div className="my-4 flex justify-center overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div ref={ref} className={rendered ? '' : 'text-xs text-gray-400 italic'}>
        {!rendered && 'Rendering diagram…'}
      </div>
    </div>
  )
}
