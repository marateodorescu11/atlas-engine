import { mulberry32 } from './rng.js'

const PARTS_A = ['Aes', 'Bor', 'Cal', 'Dor', 'El', 'Far', 'Gar', 'Hal', 'Ith', 'Jor', 'Kal', 'Lor', 'Mor', 'Nor', 'Or', 'Pol', 'Qal', 'Ren', 'Sel', 'Tor', 'Ul', 'Vor', 'Wyn', 'Xel', 'Yal', 'Zel']
const PARTS_B = ['an', 'en', 'is', 'os', 'ar', 'on', 'ir', 'ur', 'ia', 'as', 'eth', 'ith', 'oth', 'ax', 'ix', 'el', 'al', 'or', 'ul']
const PARTS_C = ['dor', 'mir', 'fen', 'vale', 'heim', 'mar', 'gard', 'hold', 'reach', 'mere', 'tor', 'moor', 'deep', 'fell', 'shaw', 'haven', 'ward', 'mark']

export function generateWorldName(seed) {
  const rng = mulberry32(seed ^ 0xcafebabe)
  const a = PARTS_A[Math.floor(rng() * PARTS_A.length)]
  const b = PARTS_B[Math.floor(rng() * PARTS_B.length)]
  const c = PARTS_C[Math.floor(rng() * PARTS_C.length)]
  return `${a}${b}${c}`
}
