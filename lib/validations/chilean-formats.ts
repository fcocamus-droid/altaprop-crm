// Format RUT: 12.345.678-9
export function formatRut(value: string): string {
  // Remove everything except digits and K/k
  let clean = value.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length === 0) return ''

  // Separate body and verifier
  const verifier = clean.slice(-1)
  const body = clean.slice(0, -1)

  if (body.length === 0) return clean

  // Add dots every 3 digits from right
  let formatted = ''
  for (let i = body.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) formatted = '.' + formatted
    formatted = body[i] + formatted
  }

  return `${formatted}-${verifier}`
}

// Validate RUT with verification digit
export function validateRut(rut: string): boolean {
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return false

  const body = clean.slice(0, -1)
  const verifier = clean.slice(-1)

  // Calculate verification digit
  let sum = 0
  let multiplier = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const remainder = 11 - (sum % 11)
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder)

  return verifier === expected
}

// Format phone: +56 9 1234 5678
export function formatPhone(value: string): string {
  const digits = value.replace(/[^0-9]/g, '')

  // If starts with 56, format as Chilean
  if (digits.startsWith('56')) {
    const rest = digits.slice(2)
    if (rest.length === 0) return '+56'
    if (rest.length <= 1) return `+56 ${rest}`
    if (rest.length <= 5) return `+56 ${rest[0]} ${rest.slice(1)}`
    return `+56 ${rest[0]} ${rest.slice(1, 5)} ${rest.slice(5, 9)}`
  }

  // If starts with 9, assume Chilean mobile
  if (digits.startsWith('9')) {
    if (digits.length <= 1) return `+56 ${digits}`
    if (digits.length <= 5) return `+56 ${digits[0]} ${digits.slice(1)}`
    return `+56 ${digits[0]} ${digits.slice(1, 5)} ${digits.slice(5, 9)}`
  }

  // Otherwise just add +56
  if (digits.length === 0) return ''
  if (digits.length <= 1) return `+56 ${digits}`
  if (digits.length <= 5) return `+56 ${digits[0]} ${digits.slice(1)}`
  return `+56 ${digits[0]} ${digits.slice(1, 5)} ${digits.slice(5, 9)}`
}

// Validate Chilean phone: must be +56 9 XXXX XXXX (9 digits after +56)
export function validatePhone(phone: string): boolean {
  const digits = phone.replace(/[^0-9]/g, '')
  // Must have 11 digits total (56 + 9 digits) and start with 569
  return digits.length === 11 && digits.startsWith('569')
}
