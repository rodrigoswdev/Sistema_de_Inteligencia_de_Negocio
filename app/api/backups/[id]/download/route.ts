import { fail } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { getBackupDownload } from "@/lib/repositories/backups";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSession();
  if (!user?.roles.includes("ADMINISTRADOR")) {
    return fail("Permiso denegado", 403);
  }
  const { id } = await context.params;
  try {
    const download = await getBackupDownload(id);
    return new Response(new Uint8Array(download.buffer), {
      headers: {
        "content-type": "application/gzip",
        "content-disposition": `attachment; filename="${download.file}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Copia no disponible", 404);
  }
}
