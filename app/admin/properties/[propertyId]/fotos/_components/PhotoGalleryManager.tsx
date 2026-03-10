'use client';

import { useActionState } from 'react';
import { photoAssignmentTargets } from '@/lib/page-content-targets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

type ActionState = {
  success: boolean;
  error?: string;
  message?: string;
  details?: string[];
};

type PhotoGalleryManagerProps = {
  propertyId: string;
  imageUrls: string[];
  uploadAction: (state: ActionState, formData: FormData) => Promise<ActionState>;
  assignAction: (state: ActionState, formData: FormData) => Promise<ActionState>;
  diagnoseAction: (state: ActionState, formData: FormData) => Promise<ActionState>;
};

const initialState: ActionState = { success: false };

export function PhotoGalleryManager({
  propertyId,
  imageUrls,
  uploadAction,
  assignAction,
  diagnoseAction,
}: PhotoGalleryManagerProps) {
  const [uploadState, uploadFormAction, uploadPending] = useActionState(uploadAction, initialState);
  const [assignState, assignFormAction, assignPending] = useActionState(assignAction, initialState);
  const [diagnoseState, diagnoseFormAction, diagnosePending] = useActionState(
    diagnoseAction,
    initialState
  );

  const onCopyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Subir imagen a Supabase Storage</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={uploadFormAction} className="space-y-3">
            <input type="hidden" name="propertyId" value={propertyId} />
            <div className="space-y-2">
              <Label htmlFor="photoFile">Selecciona una imagen</Label>
              <Input id="photoFile" name="photoFile" type="file" accept="image/*" required />
            </div>

            {uploadState.error ? <p className="text-sm text-red-600">{uploadState.error}</p> : null}
            {uploadState.success && uploadState.message ? (
              <p className="text-sm text-emerald-700">{uploadState.message}</p>
            ) : null}

            <Button type="submit" disabled={uploadPending}>
              {uploadPending ? 'Subiendo...' : 'Subir imagen'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Diagnostico de entorno</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={diagnoseFormAction} className="space-y-3">
            <p className="text-sm text-slate-600">
              Comprueba si la configuracion de Supabase para subir imagenes esta correcta.
            </p>

            <Button type="submit" variant="outline" disabled={diagnosePending}>
              {diagnosePending ? 'Ejecutando...' : 'Diagnostico de entorno'}
            </Button>

            {diagnoseState.error ? <p className="text-sm text-red-600">{diagnoseState.error}</p> : null}
            {diagnoseState.message ? (
              <p className={`text-sm ${diagnoseState.success ? 'text-emerald-700' : 'text-amber-700'}`}>
                {diagnoseState.message}
              </p>
            ) : null}

            {diagnoseState.details && diagnoseState.details.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {diagnoseState.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Galeria de imagenes</CardTitle>
        </CardHeader>
        <CardContent>
          {imageUrls.length === 0 ? (
            <p className="text-sm text-slate-600">Todavia no hay imagenes subidas para esta propiedad.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {imageUrls.map((url) => (
                <article key={url} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="aspect-[4/3] overflow-hidden rounded-md bg-slate-100">
                    <img src={url} alt="Imagen de propiedad" className="h-full w-full object-cover" />
                  </div>

                  <p className="mt-2 break-all text-xs text-slate-500">{url}</p>

                  <div className="mt-3 flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => onCopyUrl(url)}>
                      Copiar URL
                    </Button>
                  </div>

                  <form action={assignFormAction} className="mt-3 space-y-2">
                    <input type="hidden" name="propertyId" value={propertyId} />
                    <input type="hidden" name="imageUrl" value={url} />

                    <Label htmlFor={`target-${encodeURIComponent(url)}`} className="text-xs">
                      Anadir a seccion
                    </Label>
                    <Select id={`target-${encodeURIComponent(url)}`} name="target" defaultValue="turismo:queComer">
                      {photoAssignmentTargets.map((target) => (
                        <option key={target.value} value={target.value}>
                          {target.label}
                        </option>
                      ))}
                    </Select>

                    <Button type="submit" size="sm" disabled={assignPending}>
                      {assignPending ? 'Asignando...' : 'Anadir a seccion...'}
                    </Button>
                  </form>
                </article>
              ))}
            </div>
          )}

          {assignState.error ? <p className="mt-4 text-sm text-red-600">{assignState.error}</p> : null}
          {assignState.success && assignState.message ? (
            <p className="mt-4 text-sm text-emerald-700">{assignState.message}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
