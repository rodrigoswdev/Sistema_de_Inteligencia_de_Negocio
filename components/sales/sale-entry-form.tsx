"use client";

import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ApiResult {
  message?: string;
  errors?: Array<{ field?: string; message: string }>;
}

const numericValue = (form: FormData, name: string) =>
  Number(form.get(name) || 0);

export function SaleEntryForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.get("date"),
          document: form.get("document"),
          productCode: form.get("productCode"),
          productName: form.get("productName"),
          category: form.get("category"),
          branchCode: form.get("branchCode"),
          branchName: form.get("branchName"),
          region: form.get("region"),
          channelCode: form.get("channelCode"),
          channelName: form.get("channelName"),
          employeeCode: form.get("employeeCode"),
          employeeName: form.get("employeeName"),
          quantity: numericValue(form, "quantity"),
          gross: numericValue(form, "gross"),
          discount: numericValue(form, "discount"),
          returns: numericValue(form, "returns"),
          cost: numericValue(form, "cost"),
          target: numericValue(form, "target"),
        }),
      });
      const result = (await response.json()) as ApiResult;
      setSuccess(response.ok);
      setMessage(
        response.ok
          ? result.message ?? "Venta registrada correctamente."
          : result.errors?.[0]?.message ??
              result.message ??
              "No se pudo registrar la venta.",
      );
      if (response.ok) {
        formElement.reset();
        router.refresh();
      }
    } catch {
      setSuccess(false);
      setMessage("No se pudo conectar con el servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <details className="card sale-entry-card">
      <summary>
        <span>
          <span className="section-eyebrow">Operación comercial</span>
          <strong>Registrar una nueva venta</strong>
          <small>
            El importe neto y el margen se calculan automáticamente.
          </small>
        </span>
        <span className="button">
          <PlusCircle size={16} /> Nueva venta
        </span>
      </summary>

      <form className="sale-entry-form" onSubmit={submit}>
        <fieldset>
          <legend>Documento y producto</legend>
          <div className="sale-form-grid">
            <label className="field">
              Fecha
              <input name="date" type="date" required />
            </label>
            <label className="field">
              N.º de documento
              <input name="document" placeholder="FAC-0001" maxLength={50} required />
            </label>
            <label className="field">
              Código de producto
              <input name="productCode" placeholder="PROD-01" maxLength={30} required />
            </label>
            <label className="field span-2">
              Producto
              <input name="productName" placeholder="Nombre comercial" maxLength={120} required />
            </label>
            <label className="field">
              Categoría
              <input name="category" placeholder="Cervezas" maxLength={80} required />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Ubicación y responsable</legend>
          <div className="sale-form-grid">
            <label className="field">
              Código de sucursal
              <input name="branchCode" placeholder="SUC-01" maxLength={30} required />
            </label>
            <label className="field">
              Sucursal
              <input name="branchName" placeholder="La Paz" maxLength={120} required />
            </label>
            <label className="field">
              Región
              <input name="region" placeholder="Occidente" maxLength={80} required />
            </label>
            <label className="field">
              Código de canal
              <input name="channelCode" placeholder="TRAD" maxLength={30} required />
            </label>
            <label className="field">
              Canal
              <input name="channelName" placeholder="Tradicional" maxLength={100} required />
            </label>
            <label className="field">
              Código del vendedor
              <input name="employeeCode" placeholder="Opcional" maxLength={30} />
            </label>
            <label className="field span-2">
              Nombre del vendedor
              <input name="employeeName" placeholder="Opcional" maxLength={120} />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Importes de la venta</legend>
          <div className="sale-form-grid financial">
            <label className="field">
              Cantidad
              <input name="quantity" type="number" min="0.001" step="0.001" required />
            </label>
            <label className="field">
              Venta bruta (Bs)
              <input name="gross" type="number" min="0" step="0.01" required />
            </label>
            <label className="field">
              Descuento (Bs)
              <input name="discount" type="number" min="0" step="0.01" defaultValue="0" required />
            </label>
            <label className="field">
              Devolución (Bs)
              <input name="returns" type="number" min="0" step="0.01" defaultValue="0" required />
            </label>
            <label className="field">
              Costo (Bs)
              <input name="cost" type="number" min="0" step="0.01" required />
            </label>
            <label className="field">
              Meta de venta (Bs)
              <input name="target" type="number" min="0" step="0.01" defaultValue="0" required />
            </label>
          </div>
        </fieldset>

        <div className="sale-form-footer">
          <p>
            El registro quedará asociado al usuario activo y será incluido en
            la bitácora.
          </p>
          <button className="button" disabled={submitting}>
            {submitting ? "Consolidando venta..." : "Guardar venta"}
          </button>
        </div>
        {message && (
          <div className={`admin-message ${success ? "success" : "error"}`} role="status">
            {message}
          </div>
        )}
      </form>
    </details>
  );
}
