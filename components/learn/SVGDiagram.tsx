'use client'

/** Renders inline SVG from AI-generated code. Strips scripts for safety. */
export function SVGDiagram({ code }: { code: string }) {
  // Extract the <svg ...>...</svg> block
  const match = code.match(/<svg[\s\S]*<\/svg>/i)
  if (!match) {
    return (
      <pre className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 text-xs overflow-x-auto">
        <code>{code}</code>
      </pre>
    )
  }

  // Basic sanitization: remove script tags and event handlers
  const safe = match[0]
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')

  return (
    <div className="my-4 flex justify-center overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div
        className="max-w-full"
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    </div>
  )
}
