const COLORES = ['peach', 'blue', 'lavender', 'mint', 'gold', 'rose', 'sky']

export const colorDe = (i: number) => COLORES[i % COLORES.length]
export const iniciales = (nombre: string, apellido: string) => `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()

/** Foto del alumno si tiene (fotoUrl); si no, sus iniciales. "lg" es el tamaño grande para la planilla en PC. */
export function Avatar({ initials, color, fotoUrl, size = 'md' }: { initials: string; color: string; fotoUrl?: string | null; size?: 'md' | 'lg' }) {
  const clase = `avatar avatar-${color} ${size === 'lg' ? 'avatar-lg' : ''}`
  if (fotoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={`${clase} avatar-foto`} src={fotoUrl} alt={initials} />
  }
  return <span className={clase}>{initials}</span>
}
