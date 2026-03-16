export function extractJSON(text: string): string {
  // Strip markdown code blocks
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  // Find outermost JSON object
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    return cleaned.slice(start, end + 1)
  }

  return cleaned
}

const SARVAM_BASE_URL = 'https://api.sarvam.ai'
// sarvam-30b-16k: no think tags, clean output, 4-7s response, best quality/speed tradeoff
export const SARVAM_MODEL = 'sarvam-30b-16k'

function getApiKey(): string {
  const key = process.env.SARVAM_API_KEY
  if (!key) throw new Error('SARVAM_API_KEY is not set')
  return key
}

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatParams {
  messages: Message[]
  max_tokens?: number
  temperature?: number
}

/**
 * Strip HTML artifacts from markdown text, preserving code blocks.
 * Converts <br> → newline, <b>/<strong> → bold, <i>/<em> → italic, strips rest.
 */
function sanitizeMarkdown(text: string): string {
  // Split on fenced code blocks to preserve SVG/mermaid/code content
  const parts = text.split(/(```[\s\S]*?```)/g)
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part // inside code block — leave unchanged
      return part
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**')
        .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
        .replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*')
        .replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
        .replace(/<[^>]+>/g, '') // strip remaining unexpected HTML tags
    })
    .join('')
}

/**
 * sarvam-m wraps ALL output in <think>...</think>.
 * Extract the actual response: prefer text after </think>, else strip the opening tag.
 */
function stripThinkBlock(raw: string): string {
  const closeIdx = raw.lastIndexOf('</think>')
  if (closeIdx !== -1) {
    const after = raw.slice(closeIdx + 8).trim()
    if (after.length > 10) return after
  }
  // No closing tag — the answer is inside the think block; strip the opening tag
  return raw.replace(/^<think>\s*/i, '').trim()
}

export async function sarvamChat(params: ChatParams): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 55000)

  try {
    const res = await fetch(`${SARVAM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        model: SARVAM_MODEL,
        messages: [
          { role: 'system', content: 'Be direct and concise. Return only what is asked.' },
          ...params.messages,
        ],
        max_tokens: params.max_tokens ?? 4000,
        temperature: params.temperature ?? 0.7,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const err = await res.text()
      throw Object.assign(new Error(`Sarvam API error: ${err}`), { status: res.status })
    }

    const data = await res.json()
    const msg = data.choices?.[0]?.message
    const raw = msg?.content ?? msg?.reasoning_content ?? ''
    return sanitizeMarkdown(stripThinkBlock(raw))
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}

/**
 * sarvam-m does not benefit from SSE streaming (thinking + answer arrive together).
 * We fetch the full JSON response, strip think tags, then emit as one chunk.
 * This gives a clean "appear at once" experience after a short wait (~1-3s).
 */
export function sarvamStream(params: ChatParams): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const abortCtrl = new AbortController()
      const timeout = setTimeout(() => abortCtrl.abort(), 55000)

      try {
        const res = await fetch(`${SARVAM_BASE_URL}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getApiKey()}`,
          },
          body: JSON.stringify({
            model: SARVAM_MODEL,
            messages: params.messages,
            max_tokens: params.max_tokens ?? 6000,
            temperature: params.temperature ?? 0.7,
          }),
          signal: abortCtrl.signal,
        })
        clearTimeout(timeout)

        if (!res.ok) {
          const err = await res.text()
          controller.error(Object.assign(new Error(`Sarvam API error: ${err}`), { status: res.status }))
          return
        }

        const data = await res.json()
        const msg = data.choices?.[0]?.message
        const raw = msg?.content ?? msg?.reasoning_content ?? ''
        const text = sanitizeMarkdown(stripThinkBlock(raw))

        if (text) controller.enqueue(encoder.encode(text))
        controller.close()
      } catch (error) {
        clearTimeout(timeout)
        controller.error(error)
      }
    },
  })
}
