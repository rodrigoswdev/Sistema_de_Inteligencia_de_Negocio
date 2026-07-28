# Plan de pruebas

| Nivel | Cobertura | Comando |
| --- | --- | --- |
| Unitaria | Fórmulas, división por cero y semáforos | `npm test` |
| Seguridad | Matriz de acceso por rol | `npm test` |
| Estática | TypeScript estricto y contratos | `npm run typecheck` |
| Calidad | Reglas Next.js/React | `npm run lint` |
| Integración | Renderizado de páginas y Route Handlers | `npm run build` |

Antes de producción también se debe probar en un proyecto Supabase separado:
login real, RLS por cada rol, carga con filas inválidas, reintento,
concurrencia, exportaciones y rotación de secretos.
