# anotame — frontend

Panel docente (Next.js + React + Tailwind) para registrar asistencia y ver calificaciones.
Se conecta al backend `modelo-del-proyecto` (Kotlin + Spring Boot + MariaDB).

## Cómo correrlo

1. Levantá el backend (repo `modelo-del-proyecto`) en `http://localhost:8080`. Ver el README de ese repo.
2. En otra terminal, en esta carpeta:

```powershell
pnpm install
pnpm dev
```

3. Abrí http://localhost:3000

Si el backend está en otra dirección, copiá `.env.example` como `.env.local` y cambiá `NEXT_PUBLIC_API_URL`.

## Qué hace hoy

- **Resumen**: cursos, total de estudiantes, asistencia del día y evaluaciones del curso elegido.
- **Asistencia**: elegís curso y fecha, marcás P / A / T, escribís el motivo y guardás (crea o actualiza).
- **Calificaciones**: planilla de solo lectura con las evaluaciones del curso y el promedio de cada alumno.

Los datos salen de la API (`lib/api.ts`). Si el backend no responde, aparece un aviso con el botón "Reintentar".
