'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getPlanilla,
  guardarCelda,
  marcarDiaSinActividad,
  marcarTodos,
  type EstadoAsistencia,
  type Planilla,
} from '@/lib/api'
import { hoyISO } from '@/lib/fechas'

export type Letra = 'P' | 'A' | 'T'
export type Celda = { letra: Letra; justificacion: string }

export const LETRA_A_ESTADO: Record<Letra, EstadoAsistencia> = { P: 'PRESENTE', A: 'AUSENTE', T: 'TARDE' }
const ESTADO_A_LETRA: Record<string, Letra> = { PRESENTE: 'P', AUSENTE: 'A', TARDE: 'T' }
const SIGUIENTE: Record<string, Letra | null> = { none: 'P', P: 'A', A: 'T', T: null }

export const clave = (estudianteId: number, fecha: string) => `${estudianteId}|${fecha}`
const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : 'Ocurrió un error inesperado')

export type Totales = { p: number; a: number; t: number; porcentaje: number | null }

/**
 * Planilla de una cursada: alumnos × fechas de clase. Cada cambio se guarda en el backend al instante
 * (se ve en pantalla enseguida y, si el guardado falla, se vuelve a leer lo que quedó en el servidor).
 */
export function usePlanilla(cursadaId: number | null, intento: number) {
  const [planilla, setPlanilla] = useState<Planilla | null>(null)
  const [celdas, setCeldas] = useState<Record<string, Celda>>({})
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendientes, setPendientes] = useState(0)
  // Los guardados de una misma celda se encadenan para que lleguen al servidor en el orden de los clicks.
  const cola = useRef(new Map<string, Promise<unknown>>())
  const celdasRef = useRef(celdas)
  celdasRef.current = celdas

  const cargar = useCallback(async (id: number) => {
    const p = await getPlanilla(id)
    const mapa: Record<string, Celda> = {}
    for (const a of p.asistencias) {
      const letra = ESTADO_A_LETRA[a.estado]
      if (letra) mapa[clave(a.estudianteId, a.fecha)] = { letra, justificacion: a.justificacion ?? '' }
    }
    setPlanilla(p)
    setCeldas(mapa)
  }, [])

  useEffect(() => {
    if (cursadaId === null) {
      setPlanilla(null)
      setCeldas({})
      return
    }
    let cancelado = false
    setCargando(true)
    cargar(cursadaId)
      .then(() => !cancelado && setError(null))
      .catch((e) => !cancelado && setError(mensajeDe(e)))
      .finally(() => !cancelado && setCargando(false))
    return () => {
      cancelado = true
    }
  }, [cursadaId, intento, cargar])

  const guardarEnCola = (k: string, tarea: () => Promise<unknown>) => {
    setPendientes((n) => n + 1)
    const previa = cola.current.get(k) ?? Promise.resolve()
    const siguiente = previa
      .catch(() => undefined)
      .then(tarea)
      .catch(async (e) => {
        setError(mensajeDe(e))
        if (cursadaId !== null) await cargar(cursadaId).catch(() => undefined)
      })
      .finally(() => setPendientes((n) => n - 1))
    cola.current.set(k, siguiente)
  }

  const guardar = (estudianteId: number, fecha: string, celda: Celda | undefined) => {
    if (cursadaId === null) return
    guardarEnCola(clave(estudianteId, fecha), () =>
      guardarCelda(cursadaId, {
        estudianteId,
        fecha,
        estado: celda ? LETRA_A_ESTADO[celda.letra] : null,
        justificacion: celda?.justificacion.trim() || null,
      }),
    )
  }

  /** Click en una celda: — → P → A → T → —. */
  const ciclar = (estudianteId: number, fecha: string) => {
    const k = clave(estudianteId, fecha)
    const actual = celdasRef.current[k]
    const letra = SIGUIENTE[actual?.letra ?? 'none']
    const nueva: Celda | undefined = letra
      ? { letra, justificacion: letra === 'P' ? '' : (actual?.justificacion ?? '') }
      : undefined
    setCeldas((c) => {
      const copia = { ...c }
      if (nueva) copia[k] = nueva
      else delete copia[k]
      return copia
    })
    guardar(estudianteId, fecha, nueva)
  }

  const escribirMotivo = (estudianteId: number, fecha: string, texto: string) => {
    const k = clave(estudianteId, fecha)
    setCeldas((c) => (c[k] ? { ...c, [k]: { ...c[k], justificacion: texto } } : c))
  }

  const guardarMotivo = (estudianteId: number, fecha: string) => {
    const celda = celdasRef.current[clave(estudianteId, fecha)]
    if (celda) guardar(estudianteId, fecha, celda)
  }

  /** "Todos presentes": completa a los alumnos que todavía no tienen marca ese día. */
  const todosPresentes = (fecha: string) => {
    if (cursadaId === null || !planilla) return
    setCeldas((c) => {
      const copia = { ...c }
      for (const e of planilla.estudiantes) {
        const k = clave(e.id, fecha)
        if (!copia[k]) copia[k] = { letra: 'P', justificacion: '' }
      }
      return copia
    })
    guardarEnCola(`lote|${fecha}`, () => marcarTodos(cursadaId, fecha, 'PRESENTE'))
  }

  /** Marca o desmarca un día como "sin actividad" (vale para todo el curso). */
  const cambiarSinActividad = async (fecha: string, sinActividad: boolean, motivo?: string) => {
    if (cursadaId === null) return
    try {
      const dia = await marcarDiaSinActividad(cursadaId, fecha, sinActividad, motivo)
      setPlanilla((p) => (p ? { ...p, dias: p.dias.map((d) => (d.fecha === fecha ? dia : d)) } : p))
      setError(null)
    } catch (e) {
      setError(mensajeDe(e))
    }
  }

  const hoy = hoyISO()
  /** Días en los que se puede (y cuenta) tomar asistencia: ya pasaron o son hoy, y hubo actividad. */
  const diasTomables = (planilla?.dias ?? []).filter((d) => !d.sinActividad && d.fecha <= hoy)

  const totales = (estudianteId: number): Totales => {
    let p = 0
    let a = 0
    let t = 0
    for (const d of diasTomables) {
      const letra = celdas[clave(estudianteId, d.fecha)]?.letra
      if (letra === 'P') p++
      else if (letra === 'A') a++
      else if (letra === 'T') t++
    }
    const registradas = p + a + t
    return { p, a, t, porcentaje: registradas > 0 ? Math.round((p / registradas) * 100) : null }
  }

  const ultimaClase = diasTomables.length > 0 ? diasTomables[diasTomables.length - 1] : null

  return {
    planilla, celdas, cargando, error, setError, guardando: pendientes > 0,
    ciclar, escribirMotivo, guardarMotivo, todosPresentes, cambiarSinActividad,
    totales, diasTomables, ultimaClase,
  }
}
