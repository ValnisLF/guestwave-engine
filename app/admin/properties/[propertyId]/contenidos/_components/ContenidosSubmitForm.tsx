'use client';

import { createContext, useActionState, useContext } from 'react';

type SaveState = {
  success: boolean;
  error?: string;
};

type Props = {
  action: (state: SaveState, formData: FormData) => Promise<SaveState>;
  children: React.ReactNode;
};

const initialState: SaveState = { success: false };
const SubmitStateContext = createContext<{ state: SaveState; isPending: boolean } | null>(null);

export function ContenidosSubmitForm({ action, children }: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <SubmitStateContext.Provider value={{ state, isPending }}>
      <form action={formAction} className="space-y-4">
        {children}
      </form>
    </SubmitStateContext.Provider>
  );
}

export function useContenidosSubmitState() {
  const context = useContext(SubmitStateContext);

  if (!context) {
    throw new Error('useContenidosSubmitState debe usarse dentro de ContenidosSubmitForm');
  }

  return context;
}
