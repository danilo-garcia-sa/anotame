// Cliente de la API del backend (repo modelo-del-proyecto).
// La dirección sale de NEXT_PUBLIC_API_URL; si no está definida, usa el backend local.

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '')

export type Docente = { id: number; nombre: string; apellido: string; email: string }
export type Curso = { id: number; nombre: string; anioLectivo: number; docente: Docente | null }
export type Estudiante = { id: number; nombre: string; apellido: string; dni: string; fotoUrl: string | null }
export type Evaluacion = { id: number; titulo: string; descripcion: string | null; curso: { id: number } }
export type Nota = { id: number; valor: number; estudiante: { id: number }; evaluacion: { id: number } }
export type EstadoAsistencia = 'PRESENTE' | 'AUSENTE' | 'TARDE'
export type Asistencia = {
  id: number
  fecha: string
  estado: string
  justificacion: string | null
  estudiante: { id: number }
  curso: { id: number }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  // El Content-Type solo se manda cuando hay cuerpo, así los GET no necesitan "preflight" de CORS.
  const headers: Record<string, string> = init.body ? { 'Content-Type': 'application/json' } : {}

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' })
  } catch {
    throw new Error(`No se pudo conectar con el backend (${API_URL}). ¿Está corriendo?`)
  }

  if (!res.ok) {
    let detalle = ''
    try {
      const cuerpo = await res.json()
      detalle = cuerpo?.message ? `: ${cuerpo.message}` : ''
    } catch {
      // la respuesta de error no traía JSON
    }
    throw new Error(`El backend respondió ${res.status}${detalle}`)
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

export const getCursos = () => request<Curso[]>('/api/cursos')

export const getEstudiantesDelCurso = (cursoId: number) =>
  request<Estudiante[]>(`/api/cursos/${cursoId}/estudiantes`)

// /api/estudiantes devuelve una página; con size=1 alcanza para leer el total.
export const getTotalEstudiantes = async () =>
  (await request<{ totalElements: number }>('/api/estudiantes?size=1')).totalElements

export const getEvaluaciones = (cursoId: number) =>
  request<Evaluacion[]>(`/api/evaluaciones?cursoId=${cursoId}`)

export const getNotas = (cursoId: number) => request<Nota[]>(`/api/notas?cursoId=${cursoId}`)

export const getDocentes = () => request<Docente[]>('/api/docentes')

// ---------- Cursadas y planilla ----------

export type DiaSemana = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export type Cursada = {
  id: number
  docente: { id: number; nombre: string; apellido: string }
  curso: { id: number; nombre: string; anioLectivo: number }
  diasDeClase: DiaSemana[]
  fechaInicio: string
  fechaFin: string
  sistema: 'NOTAS' | 'PUNTOS'
  puntosAprobar: number | null
}

export type DiaDeClase = { fecha: string; numero: number; sinActividad: boolean; motivo: string | null }
export type CeldaAsistencia = { estudianteId: number; fecha: string; estado: EstadoAsistencia; justificacion: string | null }
export type Planilla = {
  cursada: Cursada
  dias: DiaDeClase[]
  estudiantes: Estudiante[]
  asistencias: CeldaAsistencia[]
}

export type NuevaCursada = {
  docenteId: number
  cursoId: number
  diasDeClase: DiaSemana[]
  fechaInicio: string
  fechaFin: string
}

export const getCursadas = (docenteId: number) => request<Cursada[]>(`/api/cursadas?docenteId=${docenteId}`)

export const crearCursada = (c: NuevaCursada) =>
  request<Cursada>('/api/cursadas', { method: 'POST', body: JSON.stringify(c) })

export const editarCursada = (id: number, c: NuevaCursada) =>
  request<Cursada>(`/api/cursadas/${id}`, { method: 'PUT', body: JSON.stringify(c) })

export const borrarCursada = (id: number) => request<void>(`/api/cursadas/${id}`, { method: 'DELETE' })

export const getPlanilla = (cursadaId: number) => request<Planilla>(`/api/cursadas/${cursadaId}/planilla`)

/** Una celda de la planilla. estado = null borra el registro. Se llama en cada click. */
export const guardarCelda = (
  cursadaId: number,
  c: { estudianteId: number; fecha: string; estado: EstadoAsistencia | null; justificacion?: string | null },
) => request<void>(`/api/cursadas/${cursadaId}/asistencias`, { method: 'PUT', body: JSON.stringify(c) })

export const marcarTodos = (cursadaId: number, fecha: string, estado: EstadoAsistencia = 'PRESENTE') =>
  request<void>(`/api/cursadas/${cursadaId}/asistencias/lote`, { method: 'POST', body: JSON.stringify({ fecha, estado }) })

export const marcarDiaSinActividad = (cursadaId: number, fecha: string, sinActividad: boolean, motivo?: string) =>
  request<DiaDeClase>(`/api/cursadas/${cursadaId}/dias/${fecha}`, {
    method: 'PUT',
    body: JSON.stringify({ sinActividad, motivo: motivo ?? null }),
  })

// ---------- Calificaciones ----------

export type Instancia = 'BIMESTRE_1' | 'CUATRIMESTRE_1' | 'BIMESTRE_2' | 'CUATRIMESTRE_2'
export type EstadoBimestre = 'APROBADO' | 'EN_PROCESO' | 'DESAPROBADO'
export type EvaluacionPuntos = { id: number; titulo: string; descripcion: string | null; puntosMaximos: number | null }
export type NotaPuntos = { estudianteId: number; evaluacionId: number; valor: number }
export type ResultadoInstancia = { estudianteId: number; instancia: Instancia; nota: number | null; estado: EstadoBimestre | null }
export type Calificaciones = {
  cursada: Cursada
  puntosPorClase: number
  clasesContadas: number
  metaPuntos: number
  estudiantes: Estudiante[]
  evaluaciones: EvaluacionPuntos[]
  notas: NotaPuntos[]
  instancias: ResultadoInstancia[]
}

export const getCalificaciones = (cursadaId: number) => request<Calificaciones>(`/api/cursadas/${cursadaId}/calificaciones`)

export const configurarCursada = (cursadaId: number, sistema: 'NOTAS' | 'PUNTOS', puntosAprobar: number | null) =>
  request<void>(`/api/cursadas/${cursadaId}/configuracion`, { method: 'PUT', body: JSON.stringify({ sistema, puntosAprobar }) })

export const crearEvaluacion = (cursadaId: number, e: { titulo: string; puntosMaximos: number | null }) =>
  request<EvaluacionPuntos>(`/api/cursadas/${cursadaId}/evaluaciones`, { method: 'POST', body: JSON.stringify(e) })

export const borrarEvaluacion = (cursadaId: number, evaluacionId: number) =>
  request<void>(`/api/cursadas/${cursadaId}/evaluaciones/${evaluacionId}`, { method: 'DELETE' })

export const guardarNotaPuntos = (cursadaId: number, n: { estudianteId: number; evaluacionId: number; valor: number | null }) =>
  request<void>(`/api/cursadas/${cursadaId}/notas`, { method: 'PUT', body: JSON.stringify(n) })

export const guardarInstancia = (
  cursadaId: number,
  i: { estudianteId: number; instancia: Instancia; nota?: number | null; estado?: EstadoBimestre | null },
) => request<void>(`/api/cursadas/${cursadaId}/instancias`, { method: 'PUT', body: JSON.stringify(i) })
