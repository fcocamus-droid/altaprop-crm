// Agente de IA conversacional para WhatsApp/Omnicanal — usa Claude Haiku
// Docs: https://docs.anthropic.com/en/api/messages

interface AIContext {
  personaName: string
  subscriberName: string
  systemPromptCustom?: string | null
}

interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AIResult {
  text: string
  shouldHandoff: boolean
  capturedLead?: {
    name?: string
    rut?: string
    email?: string
    phone?: string
    interest?: 'arriendo' | 'venta' | 'ambos'
    property_type?: string
  }
}

function buildSystemPrompt(ctx: AIContext): string {
  const base = `Eres ${ctx.personaName}, asistente virtual de la inmobiliaria "${ctx.subscriberName}" en Chile.

TU OBJETIVO:
Recibir consultas de potenciales clientes vía WhatsApp, calificarlos y capturar sus datos para que un corredor humano los contacte. Responder en español chileno, natural y cálido, sin emojis excesivos.

QUE HACER:
- Saluda al primer contacto si no te han saludado aun
- Averigua qué busca: arriendo o venta, tipo de propiedad (depto/casa/oficina), comuna/sector, presupuesto aproximado
- Pide datos basicos: nombre completo, RUT, email y telefono (de a poco, no todo junto)
- Si pregunta por una propiedad especifica que no conoces, dile honestamente que le vas a consultar al corredor y toma sus datos
- Si pide hablar con un humano/agente/persona, confirmas que lo derivas y termina con handoff
- Si pide agendar visita, toma sus datos completos primero y confirma que un agente lo contactara para coordinar

QUE NO HACER:
- No inventes propiedades ni precios que no te pasaron
- No respondas cosas fuera del rubro inmobiliario
- No des direcciones exactas por chat

FORMATO DE RESPUESTA:
Siempre responde con un JSON valido (sin markdown) con esta forma:
{
  "text": "lo que le dices al cliente",
  "handoff": false,
  "lead": { "name": null, "rut": null, "email": null, "phone": null, "interest": null, "property_type": null }
}

- Pon "handoff": true solo si pide hablar con humano o despues de capturar todos los datos (nombre+telefono+interes minimo) y ya no hay mas que conversar
- "lead" se acumula: si el usuario te dijo el nombre, lo pones en name; si despues te da el email, mantienes el name anterior y agregas email. Pon null en campos que no sepas todavia.`
  if (ctx.systemPromptCustom && ctx.systemPromptCustom.trim()) {
    return base + '\n\nINSTRUCCIONES ADICIONALES DEL SUSCRIPTOR:\n' + ctx.systemPromptCustom
  }
  return base
}

export async function getAIReply(
  history: AIMessage[],
  ctx: AIContext
): Promise<AIResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return {
      text: 'Hola! Gracias por tu mensaje. En unos momentos te responderemos personalmente.',
      shouldHandoff: true,
    }
  }

  const systemPrompt = buildSystemPrompt(ctx)

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 600,
        system: systemPrompt,
        messages: history.map(m => ({ role: m.role, content: m.content })),
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return {
        text: 'Disculpa, tengo un problema técnico. Un agente te contactara pronto.',
        shouldHandoff: true,
      }
    }

    const raw = data.content?.[0]?.text || ''
    // The AI is instructed to reply in JSON. Try to parse it.
    let parsed: any = null
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Try to extract JSON from possible markdown
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) { try { parsed = JSON.parse(match[0]) } catch {} }
    }

    if (parsed?.text) {
      return {
        text: String(parsed.text),
        shouldHandoff: Boolean(parsed.handoff),
        capturedLead: parsed.lead && typeof parsed.lead === 'object' ? parsed.lead : undefined,
      }
    }
    // Fallback: AI returned free text
    return { text: raw.substring(0, 1000), shouldHandoff: false }
  } catch (e) {
    return {
      text: 'Hola! Un agente te contactara pronto.',
      shouldHandoff: true,
    }
  }
}
