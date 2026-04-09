import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://vktzwnfqksywlnstsydh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdHp3bmZxa3N5d2xuc3RzeWRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4MTYwNSwiZXhwIjoyMDkwMDU3NjA1fQ.MA48QPdnj86x8hMjah6S284H9YvENJI19yhDHlsPxvk'
)

// La visita está guardada en UTC. Chile en abril es UTC-4.
// 05:00 AM Chile = 09:00 UTC (guardado en DB)
// 17:00 Chile     = 21:00 UTC (valor correcto)

// Buscar la visita del 10 abr 2026 (rango amplio en UTC para cubrir todo el día en Chile)
const { data: visits, error: fetchError } = await supabase
  .from('visits')
  .select('id, scheduled_at, property_id, status')
  .gte('scheduled_at', '2026-04-10T00:00:00+00:00')
  .lte('scheduled_at', '2026-04-11T05:00:00+00:00')

if (fetchError) {
  console.error('Error buscando visitas:', fetchError.message)
  process.exit(1)
}

console.log('Visitas del 10 abr 2026 (UTC):')
visits.forEach(v => console.log(`  ID: ${v.id} | scheduled_at: ${v.scheduled_at} | status: ${v.status}`))

// La visita en DB tiene T09:00 UTC = 05:00 AM Chile (incorrecta)
const wrongVisit = visits.find(v => v.scheduled_at.includes('T09:00'))

if (!wrongVisit) {
  console.log('\nNo se encontró visita con hora 09:00 UTC. Mostrando todas las visitas encontradas arriba.')
  process.exit(0)
}

console.log(`\nVisita incorrecta encontrada: ${wrongVisit.id}`)
console.log(`  scheduled_at actual: ${wrongVisit.scheduled_at}  (= 05:00 AM Chile)`)

// Corregir: T09:00 UTC → T21:00 UTC (= 17:00 Chile UTC-4)
const correctedAt = wrongVisit.scheduled_at.replace('T09:00:00+00:00', 'T21:00:00+00:00')
console.log(`  scheduled_at correcto: ${correctedAt}  (= 17:00 Chile)`)

const { error: updateError } = await supabase
  .from('visits')
  .update({ scheduled_at: correctedAt })
  .eq('id', wrongVisit.id)

if (updateError) {
  console.error('Error actualizando:', updateError.message)
  process.exit(1)
}

console.log('\n✅ Visita corregida exitosamente: 05:00 AM → 17:00 (5:00 PM Chile)')
