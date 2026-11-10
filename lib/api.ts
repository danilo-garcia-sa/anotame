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

export const getAsistencias = (cursoId: number, fecha: string) =>
  request<Asistencia[]>(`/api/asistencias?cursoId=${cursoId}&fecha=${fecha}`)

export type NuevaAsistencia = {
  id?: number // si ya existe un registro de ese día, se actualiza
  fecha: string // AAAA-MM-DD
  estado: EstadoAsistencia
  justificacion: string | null
  estudianteId: number
  cursoId: number
}

export function guardarAsistencia(a: NuevaAsistencia) {
  const cuerpo = JSON.stringify({
    fecha: a.fecha,
    estado: a.estado,
    justificacion: a.justificacion,
    estudiante: { id: a.estudianteId },
    curso: { id: a.cursoId },
  })
  return a.id
    ? request<Asistencia>(`/api/asistencias/${a.id}`, { method: 'PUT', body: cuerpo })
    : request<Asistencia>('/api/asistencias', { method: 'POST', body: cuerpo })
}
