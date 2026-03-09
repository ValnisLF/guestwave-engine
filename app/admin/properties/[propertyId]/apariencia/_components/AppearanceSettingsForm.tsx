'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type AppearanceState = {
  success: boolean;
  error?: string;
};

type AppearanceSettingsFormProps = {
  initialValues: {
    propertyId: string;
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
    homeHeroTitle: string;
    homeHeroSubtitle: string;
    homeDescription: string;
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apariencia</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="propertyId" value={initialValues.propertyId} />

          <Tabs defaultValue="diseno" className="w-full">
            <TabsList>
              <TabsTrigger value="diseno">Diseño</TabsTrigger>
              <TabsTrigger value="contenidos">Contenidos</TabsTrigger>
            </TabsList>

            <TabsContent value="diseno" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Color principal</Label>
                  <Input
                    id="primaryColor"
                    name="primaryColor"
                    type="color"
                    defaultValue={initialValues.primaryColor || '#1E40AF'}
                    className="h-9 w-16 p-1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accentColor">Color de acento</Label>
                  <Input
                    id="accentColor"
                    name="accentColor"
                    type="color"
                    defaultValue={initialValues.accentColor || '#0F766E'}
                    className="h-9 w-16 p-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fontFamily">Tipografía</Label>
                <Select
                  id="fontFamily"
                  name="fontFamily"
                  defaultValue={initialValues.fontFamily || 'Inter'}
                >
                  {fontOptions.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="contenidos" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="homeHeroTitle">Home · Título principal</Label>
                <Input
                  id="homeHeroTitle"
                  name="homeHeroTitle"
                  defaultValue={initialValues.homeHeroTitle}
                  placeholder="Escapadas premium junto al mar"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="homeHeroSubtitle">Home · Subtítulo</Label>
                <Input
                  id="homeHeroSubtitle"
                  name="homeHeroSubtitle"
                  defaultValue={initialValues.homeHeroSubtitle}
                  placeholder="Reserva en minutos y disfruta sin preocupaciones"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="homeDescription">Home · Descripción</Label>
                <Textarea
                  id="homeDescription"
                  name="homeDescription"
                  defaultValue={initialValues.homeDescription}
                  placeholder="Describe la propuesta de valor de tu alojamiento..."
                  rows={5}
                />
              </div>
            </TabsContent>
          </Tabs>

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
