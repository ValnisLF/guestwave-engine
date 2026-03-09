'use client';

import { useMemo, useState } from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

type AppearanceState = {
  success: boolean;
  error?: string;
};

type AppearanceSettingsFormProps = {
  initialValues: {
    propertyId: string;
    propertySlug: string;
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
  };
  action: (state: AppearanceState, formData: FormData) => Promise<AppearanceState>;
};

const initialState: AppearanceState = { success: false };

const fontOptions = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Lora', label: 'Lora' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Playfair Display', label: 'Playfair Display' },
];

export function AppearanceSettingsForm({ initialValues, action }: AppearanceSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [primaryColor, setPrimaryColor] = useState(initialValues.primaryColor || '#1E40AF');
  const [accentColor, setAccentColor] = useState(initialValues.accentColor || '#0F766E');
  const [fontFamily, setFontFamily] = useState(initialValues.fontFamily || 'Inter');

  const previewSrc = useMemo(() => {
    const query = new URLSearchParams({
      previewTheme: '1',
      previewPrimary: primaryColor,
      previewAccent: accentColor,
      previewFont: fontFamily,
    });

    return `/properties/${encodeURIComponent(initialValues.propertySlug)}?${query.toString()}`;
  }, [accentColor, fontFamily, initialValues.propertySlug, primaryColor]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apariencia</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="propertyId" value={initialValues.propertyId} />

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Color principal</Label>
                <Input
                  id="primaryColor"
                  name="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(event) => setPrimaryColor(event.target.value)}
                  className="h-9 w-16 p-1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Color de acento</Label>
                <Input
                  id="accentColor"
                  name="accentColor"
                  type="color"
                  value={accentColor}
                  onChange={(event) => setAccentColor(event.target.value)}
                  className="h-9 w-16 p-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fontFamily">Tipografía</Label>
              <Select
                id="fontFamily"
                name="fontFamily"
                value={fontFamily}
                onChange={(event) => setFontFamily(event.target.value)}
              >
                {fontOptions.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Vista previa en tiempo real</Label>
            <p className="text-xs text-slate-500">
              Esta vista aplica los cambios seleccionados sin guardarlos en base de datos.
            </p>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              <iframe
                key={previewSrc}
                title="Vista previa home publica"
                src={previewSrc}
                className="h-[720px] w-full"
              />
            </div>
          </div>

          {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-emerald-700">Ajustes guardados correctamente.</p> : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
