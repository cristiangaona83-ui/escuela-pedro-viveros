"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

/**
 * Confirmación destructiva reutilizable en toda la plataforma -- reemplaza
 * `window.confirm`. `requireTypedConfirmation` exige escribir literalmente
 * "ELIMINAR" antes de habilitar el botón, para acciones especialmente
 * sensibles (ej. eliminar una evaluación con calificaciones asociadas).
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Eliminar",
  requireTypedConfirmation = false,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  requireTypedConfirmation?: boolean;
  loading?: boolean;
}) {
  const [typedValue, setTypedValue] = useState("");
  const canConfirm = !requireTypedConfirmation || typedValue.trim().toUpperCase() === "ELIMINAR";

  function handleClose() {
    if (loading) return;
    setTypedValue("");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 text-sm text-slate-600">{description}</div>
      </div>

      {requireTypedConfirmation && (
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Escribe <span className="font-semibold text-slate-700">ELIMINAR</span> para confirmar
          </label>
          <input
            type="text"
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            className="block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
            autoFocus
          />
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onConfirm}
          disabled={!canConfirm || loading}
          className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Eliminando…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
