'use client'

import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { cn } from '@/lib/utils'

// Heavy diagram libraries — loaded on demand only, not on initial page parse
const MermaidDiagram = dynamic(
  () => import('./MermaidDiagram').then((m) => ({ default: m.MermaidDiagram })),
  { ssr: false, loading: () => <pre className="text-xs text-gray-400 italic p-2">Loading diagram…</pre> }
)
const SVGDiagram = dynamic(
  () => import('./SVGDiagram').then((m) => ({ default: m.SVGDiagram })),
  { ssr: false }
)
const ChartDiagram = dynamic(
  () => import('./ChartDiagram').then((m) => ({ default: m.ChartDiagram })),
  { ssr: false }
)

/**
 * Convert \(...\) and \[...\] LaTeX delimiters to $...$ / $$...$$
 * Skips fenced code blocks so diagram content is never corrupted.
 */
function preprocessContent(content: string): string {
  const result: string[] = []
  let i = 0
  while (i < content.length) {
    if (content.startsWith('```', i)) {
      const end = content.indexOf('\n```', i + 3)
      if (end !== -1) {
        result.push(content.slice(i, end + 4))
        i = end + 4
        continue
      }
    }
    const nextFence = content.indexOf('```', i)
    const chunk = nextFence === -1 ? content.slice(i) : content.slice(i, nextFence)
    result.push(
      chunk
        .replace(/\\\(/g, '$').replace(/\\\)/g, '$')
        .replace(/\\\[/g, '$$$$').replace(/\\\]/g, '$$$$')
    )
    i = nextFence === -1 ? content.length : nextFence
  }
  return result.join('')
}

interface StreamingResponseProps {
  content: string
  isStreaming: boolean
  className?: string
}

export function StreamingResponse({ content, isStreaming, className }: StreamingResponseProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isStreaming) return
    // Scroll at most once per second to avoid layout thrashing
    const id = setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 1000)
    return () => clearTimeout(id)
  }, [content, isStreaming])

  return (
    <div className={cn('relative', className)}>
      {isStreaming ? (
        // During streaming: plain pre-formatted text — no expensive markdown parsing
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          {content}
          <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-orange-600 align-middle" />
        </pre>
      ) : (
        // After done: full markdown + math rendering
        <div className="prose prose-orange dark:prose-invert max-w-none text-sm leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              code({ node, className: cls, children, ...props }) {
                const lang = cls?.replace('language-', '') ?? ''
                if (lang === 'mermaid') return <MermaidDiagram chart={String(children).trim()} />
                if (lang === 'svg') return <SVGDiagram code={String(children).trim()} />
                if (lang === 'chart') return <ChartDiagram code={String(children).trim()} />
                return (
                  <code
                    className={cn(
                      'rounded bg-orange-50 px-1 py-0.5 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
                      cls
                    )}
                    {...props}
                  >
                    {children}
                  </code>
                )
              },
              strong({ children }) {
                return <strong className="font-semibold text-orange-700 dark:text-orange-300">{children}</strong>
              },
            }}
          >
            {preprocessContent(content)}
          </ReactMarkdown>
        </div>
      )}
      <div ref={endRef} />
    </div>
  )
}
