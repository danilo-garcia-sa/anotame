import type { DiaSemana } from '@/lib/api'

const dos = (n: number) => String(n).padStart(2, '0')

export function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}

export const aFecha = (iso: string) => {
  const [anio, mes, dia] = iso.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

export function fechaLarga(iso: string) {
  return aFecha(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
}

export const diaMes = (iso: string) => aFecha(iso).getDate()
export const mesCorto = (iso: string) => aFecha(iso).toLocaleDateString('es-AR', { month: 'short' }).replace('.', '').toUpperCase()
export const fechaCorta = (iso: string) => aFecha(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })

export const DIAS_SEMANA: { valor: DiaSemana; corto: string; largo: string }[] = [
  { valor: 'MONDAY', corto: 'L', largo: 'Lunes' },
  { valor: 'TUESDAY', corto: 'M', largo: 'Martes' },
  { valor: 'WEDNESDAY', corto: 'X', largo: 'Miércoles' },
  { valor: 'THURSDAY', corto: 'J', largo: 'Jueves' },
  { valor: 'FRIDAY', corto: 'V', largo: 'Viernes' },
  { valor: 'SATURDAY', corto: 'S', largo: 'Sábado' },
]

export const nombresDias = (dias: DiaSemana[]) =>
  DIAS_SEMANA.filter((d) => dias.includes(d.valor)).map((d) => d.largo).join(' y ')

/** Períodos de cursada típicos para un año lectivo. */
export const periodos = (anio: number) => [
  { id: 'anio', nombre: 'Año lectivo', inicio: `${anio}-03-02`, fin: `${anio}-12-11` },
  { id: 'c1', nombre: '1.º cuatrimestre', inicio: `${anio}-03-02`, fin: `${anio}-07-17` },
  { id: 'c2', nombre: '2.º cuatrimestre', inicio: `${anio}-08-03`, fin: `${anio}-12-11` },
]
