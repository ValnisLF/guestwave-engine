'use client';

import { useState, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type SectionKey = 'homePage' | 'laPropiedad' | 'turismo' | 'reservas' | 'tarifas' | 'contacto';

type EditorState = {
  success: boolean;
  error?: string;
  section?: string;
};

type EditorProps = {
  initialValues: Record<SectionKey, Record<string, string>>;
  action: (state: EditorState, formData: FormData) => Promise<EditorState>;
};

type FieldConfig = {
  name: string;
  label: string;
  type: 'input' | 'textarea';
};

const sectionConfig: Array<{ key: SectionKey; label: string; fields: FieldConfig[] }> = [
  {
    key: 'homePage',
    label: 'Home',
    fields: [
      { name: 'overlayHeroTitle', label: 'Overlay Hero Title', type: 'input' },
      { name: 'overlayHeroSubtitle', label: 'Overlay Hero Subtitle', type: 'input' },
      { name: 'shortBioTitle', label: 'Short Bio Title', type: 'input' },
      { name: 'shorBioText', label: 'Short Bio Text', type: 'textarea' },
      { name: 'amenitiesTitle', label: 'Amenities Title', type: 'input' },
      { name: 'amenitiesText', label: 'Amenities Text', type: 'textarea' },
    ],
  },
  {
    key: 'laPropiedad',
    label: 'La Propiedad',
    fields: [
      { name: 'overlayHeroTitle', label: 'Overlay Hero Title', type: 'input' },
      { name: 'overlayHeroSubtitle', label: 'Overlay Hero Subtitle', type: 'input' },
      { name: 'shortBioTitle', label: 'Short Bio Title', type: 'input' },
      { name: 'shorBioText', label: 'Short Bio Text', type: 'textarea' },
      { name: 'groundFloorTitle', label: 'Ground Floor Title', type: 'input' },
      { name: 'groundFloorText', label: 'Ground Floor Text', type: 'textarea' },
      { name: 'firstFloorTitle', label: 'First Floor Title', type: 'input' },
      { name: 'firstFloorText', label: 'First Floor Text', type: 'textarea' },
      { name: 'exteriorTitle', label: 'Exterior Title', type: 'input' },
      { name: 'exteriorText', label: 'Exterior Text', type: 'textarea' },
    ],
  },
  {
    key: 'turismo',
    label: 'Turismo',
    fields: [
      { name: 'overlayHeroTitle', label: 'Overlay Hero Title', type: 'input' },
      { name: 'overlayHeroSubtitle', label: 'Overlay Hero Subtitle', type: 'input' },
      { name: 'shortBioTitle', label: 'Short Bio Title', type: 'input' },
      { name: 'shorBioText', label: 'Short Bio Text', type: 'textarea' },
      { name: 'queHacerTitle', label: 'Que Hacer Title', type: 'input' },
      { name: 'queHacerText', label: 'Que Hacer Text', type: 'textarea' },
      { name: 'queVisitarTitle', label: 'Que Visitar Title', type: 'input' },
      { name: 'queVisitarText', label: 'Que Visitar Text', type: 'textarea' },
      { name: 'queComerTitle', label: 'Que Comer Title', type: 'input' },
      { name: 'queComerText', label: 'Que Comer Text', type: 'textarea' },
    ],
  },
  {
    key: 'reservas',
    label: 'Reservas',
    fields: [
      { name: 'overlayHeroTitle', label: 'Overlay Hero Title', type: 'input' },
      { name: 'overlayHeroSubtitle', label: 'Overlay Hero Subtitle', type: 'input' },
      { name: 'shortBioTitle', label: 'Short Bio Title', type: 'input' },
      { name: 'shorBioText', label: 'Short Bio Text', type: 'textarea' },
      { name: 'instructions', label: 'Instructions', type: 'textarea' },
    ],
  },
  {
    key: 'tarifas',
    label: 'Tarifas',
    fields: [
      { name: 'overlayHeroTitle', label: 'Overlay Hero Title', type: 'input' },
      { name: 'overlayHeroSubtitle', label: 'Overlay Hero Subtitle', type: 'input' },
      { name: 'shortBioTitle', label: 'Short Bio Title', type: 'input' },
      { name: 'shorBioText', label: 'Short Bio Text', type: 'textarea' },
      { name: 'temporadaAlta', label: 'Temporada Alta', type: 'textarea' },
      { name: 'temporadaMedia', label: 'Temporada Media', type: 'textarea' },
      { name: 'temporadaBaja', label: 'Temporada Baja', type: 'textarea' },
      { name: 'politicas', label: 'Politicas', type: 'textarea' },
    ],
  },
  {
    key: 'contacto',
    label: 'Contacto',
    fields: [
      { name: 'overlayHeroTitle', label: 'Overlay Hero Title', type: 'input' },
      { name: 'overlayHeroSubtitle', label: 'Overlay Hero Subtitle', type: 'input' },
      { name: 'shortBioTitle', label: 'Short Bio Title', type: 'input' },
      { name: 'shorBioText', label: 'Short Bio Text', type: 'textarea' },
      { name: 'telefono', label: 'Telefono', type: 'input' },
      { name: 'email', label: 'Email', type: 'input' },
      { name: 'direccion', label: 'Direccion', type: 'input' },
    ],
  },
];

const initialState: EditorState = { success: false };

export function PageContentSectionsEditor({ initialValues, action }: EditorProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>('homePage');
  const [state, formAction, isPending] = useActionState(action, initialState);

  const currentSection = sectionConfig.find((section) => section.key === activeSection)!;
  const sectionValues = initialValues[activeSection] ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editor de Secciones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <aside className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-2">
            {sectionConfig.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  activeSection === section.key
                    ? 'bg-white font-medium text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                {section.label}
              </button>
            ))}
          </aside>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="section" value={activeSection} />

            {currentSection.fields.map((field) => (
              <div key={field.name} className="space-y-1">
                <Label htmlFor={`${activeSection}-${field.name}`}>{field.label}</Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    id={`${activeSection}-${field.name}`}
                    name={field.name}
                    defaultValue={sectionValues[field.name] ?? ''}
                    rows={4}
                  />
                ) : (
                  <Input
                    id={`${activeSection}-${field.name}`}
                    name={field.name}
                    defaultValue={sectionValues[field.name] ?? ''}
                  />
                )}
              </div>
            ))}

            {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
            {state.success && state.section === activeSection ? (
              <p className="text-sm text-emerald-700">Seccion guardada correctamente.</p>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando...' : 'Guardar Seccion'}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
