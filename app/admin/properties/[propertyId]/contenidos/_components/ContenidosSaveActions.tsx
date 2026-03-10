'use client';

import { Button } from '@/components/ui/button';
import { useContenidosSubmitState } from './ContenidosSubmitForm';

export function ContenidosSaveActions() {
  const { state, isPending } = useContenidosSubmitState();

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-emerald-700">Contenido guardado correctamente.</p> : null}
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Guardando...' : 'Guardar contenido'}
      </Button>
    </div>
  );
}
