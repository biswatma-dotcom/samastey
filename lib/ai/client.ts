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
export const SARVAM_MODEL = 'sarvam-30b'

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

export async function sarvamChat(params: ChatParams): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 55000) // 55s — leaves buffer before Vercel's 60s limit

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
  return msg?.content ?? msg?.reasoning_content ?? ''
}

export function sarvamStream(params: ChatParams): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const streamAbort = new AbortController()
      const streamTimeout = setTimeout(() => streamAbort.abort(), 55000) // 55s — graceful abort before Vercel's 60s limit

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
            stream: true,
          }),
          signal: streamAbort.signal,
        })

        if (!res.ok) {
          clearTimeout(streamTimeout)
          const err = await res.text()
          controller.error(Object.assign(new Error(`Sarvam API error: ${err}`), { status: res.status }))
          return
        }

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let inThinkBlock = false

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              clearTimeout(streamTimeout)
              controller.close()
              return
            }
            try {
              const chunk = JSON.parse(data)
              const text: string = chunk.choices?.[0]?.delta?.content ?? ''
              if (!text) continue

              // Strip <think>...</think> blocks — reasoning model leakage
              let output = ''
              let remaining = text
              while (remaining.length > 0) {
                if (inThinkBlock) {
                  const closeIdx = remaining.indexOf('</think>')
                  if (closeIdx === -1) { remaining = ''; break }
                  inThinkBlock = false
                  remaining = remaining.slice(closeIdx + 8)
                } else {
                  const openIdx = remaining.indexOf('<think>')
                  if (openIdx === -1) { output += remaining; break }
                  output += remaining.slice(0, openIdx)
                  inThinkBlock = true
                  remaining = remaining.slice(openIdx + 7)
                }
              }
              if (output) controller.enqueue(encoder.encode(output))
            } catch {
              // Skip malformed SSE line
            }
          }
        }
        clearTimeout(streamTimeout)
        controller.close()
      } catch (error) {
        clearTimeout(streamTimeout)
        controller.error(error)
      }
    },
  })
}
