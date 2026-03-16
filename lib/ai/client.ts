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
  const timeout = setTimeout(() => controller.abort(), 60000) // 60s timeout

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
      let attempt = 0
      const maxAttempts = 3

      while (attempt < maxAttempts) {
        try {
          // Use non-streaming JSON call — sarvam-m is a reasoning model;
          // the think phase produces no useful output to stream, so we wait
          // for the full response and emit it as a single chunk.
          const res = await fetch(`${SARVAM_BASE_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${getApiKey()}`,
            },
            body: JSON.stringify({
              model: SARVAM_MODEL,
              messages: params.messages,
              max_tokens: params.max_tokens ?? 1500,
              temperature: params.temperature ?? 0.7,
            }),
          })

          if (!res.ok) {
            const err = await res.text()
            throw Object.assign(new Error(`Sarvam API error: ${err}`), { status: res.status })
          }

          const data = await res.json()
          const msg = data.choices?.[0]?.message
          const text = msg?.content ?? msg?.reasoning_content ?? ''

          if (text) controller.enqueue(encoder.encode(text))
          controller.close()
          return
        } catch (error: any) {
          attempt++
          if (attempt >= maxAttempts) {
            controller.error(error)
            return
          }
          if (error?.status === 429 || error?.status >= 500) {
            await new Promise((res) => setTimeout(res, Math.pow(2, attempt) * 1000))
          } else {
            controller.error(error)
            return
          }
        }
      }
    },
  })
}
