# Copias de seguridad

El apartado se encuentra en `/auditoria` y solamente aparece para el rol
`ADMINISTRADOR`.

## Puesta en marcha

1. Ejecutar `supabase/migrations/202607260002_copias_seguridad.sql` desde SQL
   Editor, o ejecutar:

   ```powershell
   npm.cmd run db:migrate:backups
   ```

2. Configurar `SUPABASE_SERVICE_ROLE_KEY` en `.env`. La clave se utiliza
   únicamente en el servidor para crear el bucket privado `system-backups`.
3. Configurar `BACKUP_CRON_SECRET` con un valor largo y aleatorio.
4. Desde Auditoría seleccionar frecuencia, hora, día y cantidad de copias a
   conservar.

## Ejecución automática

Un programador externo debe realizar un `POST` periódico a:

```text
/api/backups/run-due
```

incluyendo el encabezado:

```text
x-backup-secret: valor-de-BACKUP_CRON_SECRET
```

El endpoint evalúa si corresponde ejecutar una copia. Las copias son JSON
comprimidos con GZIP, incluyen checksum SHA-256 y se almacenan en un bucket
privado. La retención elimina las copias más antiguas cuando supera el límite
configurado.

Estas copias protegen los datos de la aplicación. Se recomienda mantener
también habilitadas las copias administradas por Supabase correspondientes al
plan contratado.
