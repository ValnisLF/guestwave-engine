'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

const HEX_COLOR_REGEX = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const fontFamilyMap: Record<string, string> = {
  Inter: "'Inter', Arial, Helvetica, sans-serif",
  Lora: "'Lora', Georgia, serif",
  Montserrat: "'Montserrat', Arial, Helvetica, sans-serif",
  Poppins: "'Poppins', Arial, Helvetica, sans-serif",
  'Playfair Display': "'Playfair Display', Georgia, serif",
};

function sanitizeHexColor(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return HEX_COLOR_REGEX.test(trimmed) ? trimmed : null;
}

function resolvePreviewFont(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return fontFamilyMap[trimmed] ?? null;
}

export function PreviewThemeOverrides() {
  const searchParams = useSearchParams();

  const previewTheme = searchParams.get('previewTheme') === '1';

  const css = useMemo(() => {
    if (!previewTheme) return null;

    const previewPrimary = sanitizeHexColor(searchParams.get('previewPrimary'));
    const previewAccent = sanitizeHexColor(searchParams.get('previewAccent'));
    const previewFont = resolvePreviewFont(searchParams.get('previewFont'));

    const declarations = [
      previewPrimary ? `--primary:${previewPrimary};--primary-color:${previewPrimary};` : '',
      previewAccent ? `--accent:${previewAccent};--accent-color:${previewAccent};` : '',
      previewFont ? `--property-font:${previewFont};` : '',
    ].join('');

    if (!declarations) return null;

    return `:root{${declarations}}body{${declarations}}`;
  }, [previewTheme, searchParams]);

  if (!css) return null;

  return <style>{css}</style>;
}
