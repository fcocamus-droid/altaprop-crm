/**
 * Flat list of Chilean communes recognized by MercadoLibre.
 * Keys must match exactly what is stored in the ML_CITY_MAP in lib/ml/client.ts.
 * Sorted alphabetically and grouped by region for display purposes.
 */

export interface MLCommune {
  name: string          // Display name (title-cased)
  key: string           // Lowercase key used in ML_CITY_MAP
  region: string        // Region label for grouping
}

export const ML_COMMUNES: MLCommune[] = [
  // ── Región Metropolitana ──────────────────────────────────────────
  { name: 'Buin',                  key: 'buin',                region: 'Región Metropolitana' },
  { name: 'Cerrillos',             key: 'cerrillos',           region: 'Región Metropolitana' },
  { name: 'Cerro Navia',           key: 'cerro navia',         region: 'Región Metropolitana' },
  { name: 'Colina',                key: 'colina',              region: 'Región Metropolitana' },
  { name: 'Conchalí',              key: 'conchalí',            region: 'Región Metropolitana' },
  { name: 'El Bosque',             key: 'el bosque',           region: 'Región Metropolitana' },
  { name: 'Estación Central',      key: 'estación central',    region: 'Región Metropolitana' },
  { name: 'Huechuraba',            key: 'huechuraba',          region: 'Región Metropolitana' },
  { name: 'Independencia',         key: 'independencia',       region: 'Región Metropolitana' },
  { name: 'La Cisterna',           key: 'la cisterna',         region: 'Región Metropolitana' },
  { name: 'La Florida',            key: 'la florida',          region: 'Región Metropolitana' },
  { name: 'La Granja',             key: 'la granja',           region: 'Región Metropolitana' },
  { name: 'La Pintana',            key: 'la pintana',          region: 'Región Metropolitana' },
  { name: 'La Reina',              key: 'la reina',            region: 'Región Metropolitana' },
  { name: 'Lampa',                 key: 'lampa',               region: 'Región Metropolitana' },
  { name: 'Las Condes',            key: 'las condes',          region: 'Región Metropolitana' },
  { name: 'Lo Barnechea',          key: 'lo barnechea',        region: 'Región Metropolitana' },
  { name: 'Lo Espejo',             key: 'lo espejo',           region: 'Región Metropolitana' },
  { name: 'Lo Prado',              key: 'lo prado',            region: 'Región Metropolitana' },
  { name: 'Macul',                 key: 'macul',               region: 'Región Metropolitana' },
  { name: 'Maipú',                 key: 'maipú',               region: 'Región Metropolitana' },
  { name: 'Melipilla',             key: 'melipilla',           region: 'Región Metropolitana' },
  { name: 'Ñuñoa',                 key: 'ñuñoa',               region: 'Región Metropolitana' },
  { name: 'Pedro Aguirre Cerda',   key: 'pedro aguirre cerda', region: 'Región Metropolitana' },
  { name: 'Peñaflor',              key: 'peñaflor',            region: 'Región Metropolitana' },
  { name: 'Peñalolén',             key: 'peñalolén',           region: 'Región Metropolitana' },
  { name: 'Providencia',           key: 'providencia',         region: 'Región Metropolitana' },
  { name: 'Pudahuel',              key: 'pudahuel',            region: 'Región Metropolitana' },
  { name: 'Puente Alto',           key: 'puente alto',         region: 'Región Metropolitana' },
  { name: 'Quilicura',             key: 'quilicura',           region: 'Región Metropolitana' },
  { name: 'Recoleta',              key: 'recoleta',            region: 'Región Metropolitana' },
  { name: 'Renca',                 key: 'renca',               region: 'Región Metropolitana' },
  { name: 'San Bernardo',          key: 'san bernardo',        region: 'Región Metropolitana' },
  { name: 'San Joaquín',           key: 'san joaquín',         region: 'Región Metropolitana' },
  { name: 'San Miguel',            key: 'san miguel',          region: 'Región Metropolitana' },
  { name: 'San Ramón',             key: 'san ramón',           region: 'Región Metropolitana' },
  { name: 'Santiago',              key: 'santiago',            region: 'Región Metropolitana' },
  { name: 'Talagante',             key: 'talagante',           region: 'Región Metropolitana' },
  { name: 'Vitacura',              key: 'vitacura',            region: 'Región Metropolitana' },
]

/** Returns true if the given commune name (any casing) is in the ML map */
export function isMLCommune(value: string): boolean {
  if (!value) return false
  const normalized = value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return ML_COMMUNES.some(c => {
    const cn = c.key.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return cn === normalized
  })
}

/** Groups communes by region for use in <optgroup> */
export function getGroupedCommunes(): Record<string, MLCommune[]> {
  return ML_COMMUNES.reduce<Record<string, MLCommune[]>>((acc, c) => {
    if (!acc[c.region]) acc[c.region] = []
    acc[c.region].push(c)
    return acc
  }, {})
}
