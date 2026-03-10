'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type StringArrayEditorProps = {
  name: string;
  label: string;
  initialValue: string[];
  addLabel?: string;
};

type ObjectArrayEditorProps = {
  name: string;
  label: string;
  initialValue: Array<Record<string, string | undefined>>;
  fields: Array<{ key: string; label: string; placeholder?: string }>;
  addLabel?: string;
};

export function StringArrayEditor({
  name,
  label,
  initialValue,
  addLabel = 'Anadir item',
}: StringArrayEditorProps) {
  const [items, setItems] = useState<string[]>(initialValue);

  const serialized = useMemo(() => JSON.stringify(items), [items]);

  return (
    <div className="space-y-2 rounded-md border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button type="button" variant="outline" onClick={() => setItems((prev) => [...prev, ''])}>
          {addLabel}
        </Button>
      </div>

      {items.length === 0 ? <p className="text-sm text-slate-500">Sin items.</p> : null}

      {items.map((item, index) => (
        <div key={`${name}-${index}`} className="flex gap-2">
          <Input
            value={item}
            onChange={(event) => {
              const next = [...items];
              next[index] = event.target.value;
              setItems(next);
            }}
            placeholder={`Item ${index + 1}`}
          />
          <Button type="button" variant="outline" onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}>
            Quitar
          </Button>
        </div>
      ))}

      <input type="hidden" name={name} value={serialized} />
    </div>
  );
}

export function ObjectArrayEditor({
  name,
  label,
  initialValue,
  fields,
  addLabel = 'Anadir fila',
}: ObjectArrayEditorProps) {
  const [rows, setRows] = useState<Array<Record<string, string | undefined>>>(initialValue);

  const serialized = useMemo(() => JSON.stringify(rows), [rows]);

  return (
    <div className="space-y-2 rounded-md border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const next: Record<string, string> = {};
            for (const field of fields) next[field.key] = '';
            setRows((prev) => [...prev, next]);
          }}
        >
          {addLabel}
        </Button>
      </div>

      {rows.length === 0 ? <p className="text-sm text-slate-500">Sin filas.</p> : null}

      {rows.map((row, index) => (
        <div key={`${name}-${index}`} className="space-y-2 rounded-md border border-slate-200 p-3">
          {fields.map((field) => (
            <Input
              key={`${name}-${index}-${field.key}`}
              value={row[field.key] ?? ''}
              onChange={(event) => {
                const next = [...rows];
                next[index] = {
                  ...next[index],
                  [field.key]: event.target.value,
                };
                setRows(next);
              }}
              placeholder={field.placeholder ?? field.label}
            />
          ))}
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}>
              Quitar fila
            </Button>
          </div>
        </div>
      ))}

      <input type="hidden" name={name} value={serialized} />
    </div>
  );
}
