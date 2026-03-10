import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@infra/prisma';
import { createClient } from '@supabase/supabase-js';
import type { PhotoAssignmentTarget } from '@/lib/page-content-targets';
import { photoAssignmentTargetSchema } from '@/lib/page-content-targets';
import { getAuthenticatedAdminEmail, canManagePropertyByEmail } from '@/lib/admin-auth';
import { PropertyPageContentSchema, createEmptyPropertyPageContent } from '@/lib/schemas/property';
import { randomUUID } from 'crypto';
import { PhotoGalleryManager } from './_components/PhotoGalleryManager';

const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'property-media';

function normalizeEnvValue(value: string | undefined) {
  if (!value) return '';
  const trimmed = value.trim();
  return trimmed.replace(/^['"]|['"]$/g, '');
}

function normalizeSupabaseUrl(value: string | undefined) {
  const normalized = normalizeEnvValue(value);
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asSections(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function resolvePhotoTarget(target: PhotoAssignmentTarget): {
  section: string;
  title: string;
} {
  const [section, slot] = target.split(':') as [string, string];

  const titleMap: Record<string, string> = {
    hero: 'Hero',
    amenities: 'Amenities',
    groundFloor: 'Planta baja',
    firstFloor: 'Primera planta',
    exterior: 'Exterior',
    queHacer: 'Que hacer',
    queVisitar: 'Que visitar',
    queComer: 'Que comer',
    instructions: 'Instrucciones',
    temporadaAlta: 'Temporada alta',
    temporadaMedia: 'Temporada media',
    temporadaBaja: 'Temporada baja',
    politicas: 'Politicas',
    general: 'General',
  };

  return {
    section,
    title: titleMap[slot] ?? slot,
  };
}

function inferFileExtension(file: Blob & { name?: string; type?: string }) {
  const filename = file.name || '';
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex >= 0 && dotIndex < filename.length - 1) {
    return filename.slice(dotIndex + 1).toLowerCase();
  }

  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'jpg';
}

async function ensurePropertyAccess(propertyId: string) {
  const email = await getAuthenticatedAdminEmail('action');
  if (!email) return false;
  return canManagePropertyByEmail(email, propertyId);
}

export default async function PropertyFotosPage({
  params,
}: {
  params: Promise<{ propertyId: string }> | { propertyId: string };
}) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const propertyId = resolvedParams.propertyId;
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrls: true,
    },
  });

  if (!property) {
    redirect('/admin');
  }

  const propertySlug = property.slug;

  async function uploadPhotoAction(
    _state: { success: boolean; error?: string; message?: string },
    formData: FormData
  ) {
    'use server';

    try {
      const allowed = await ensurePropertyAccess(propertyId);
      if (!allowed) {
        return { success: false, error: 'Unauthorized' };
      }

      const fileField = formData.get('photoFile');
      if (!(fileField instanceof Blob)) {
        return {
          success: false,
          error: 'No se encontro el archivo a subir',
        };
      }

      const file = fileField as Blob & { name?: string; type?: string; size: number };
      const fileType = file.type || '';
      if (!fileType.startsWith('image/')) {
        return {
          success: false,
          error: 'Solo se permiten imagenes',
        };
      }

      if (file.size <= 0) {
        return {
          success: false,
          error: 'El archivo esta vacio',
        };
      }

      const maxBytes = 10 * 1024 * 1024;
      if (file.size > maxBytes) {
        return {
          success: false,
          error: 'Tamano maximo de imagen: 10MB',
        };
      }

      const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
      const serviceRoleKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

      if (!supabaseUrl || !serviceRoleKey) {
        return {
          success: false,
          error:
            'Config invalida de Supabase: revisa NEXT_PUBLIC_SUPABASE_URL (https://...) y SUPABASE_SERVICE_ROLE_KEY en .env.local',
        };
      }

      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const bucketsResult = await supabase.storage.listBuckets();
      if (bucketsResult.error) {
        return {
          success: false,
          error: `No se pudo verificar buckets de Storage: ${bucketsResult.error.message}`,
        };
      }

      const bucketExists = (bucketsResult.data ?? []).some(
        (bucket) => bucket.name === SUPABASE_STORAGE_BUCKET
      );

      if (!bucketExists) {
        const createBucketResult = await supabase.storage.createBucket(SUPABASE_STORAGE_BUCKET, {
          public: true,
        });

        if (createBucketResult.error) {
          return {
            success: false,
            error: `Bucket no encontrado y no se pudo crear (${SUPABASE_STORAGE_BUCKET}): ${createBucketResult.error.message}`,
          };
        }
      }

      const extension = inferFileExtension(file);
      const filePath = `properties/${propertyId}/${Date.now()}-${randomUUID()}.${extension}`;

      const upload = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(filePath, file, {
        contentType: fileType,
        upsert: false,
      });

      if (upload.error) {
        return {
          success: false,
          error: `No se pudo subir la imagen al bucket ${SUPABASE_STORAGE_BUCKET}: ${upload.error.message}`,
        };
      }

      const publicUrl = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(filePath).data.publicUrl;

      const current = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { imageUrls: true },
      });

      if (!current) {
        return {
          success: false,
          error: 'Property not found',
        };
      }

      const nextUrls = Array.from(new Set([...(current.imageUrls ?? []), publicUrl]));

      await prisma.property.update({
        where: { id: propertyId },
        data: {
          imageUrls: nextUrls,
        },
      });

      revalidatePath(`/admin/properties/${propertyId}/fotos`);
      revalidatePath(`/properties/${propertySlug}`);
      revalidatePath(`/properties/${propertySlug}/la-propiedad`);
      revalidatePath(`/properties/${propertySlug}/turismo`);
      revalidatePath(`/properties/${propertySlug}/reservas`);
      revalidatePath(`/properties/${propertySlug}/tarifas`);
      revalidatePath(`/properties/${propertySlug}/contacto`);

      return {
        success: true,
        message: 'Imagen subida correctamente.',
      };
    } catch (error) {
      console.error('uploadPhotoAction error:', error);
      return {
        success: false,
        error: 'Error subiendo imagen',
      };
    }
  }

  async function assignPhotoAction(
    _state: { success: boolean; error?: string; message?: string },
    formData: FormData
  ) {
    'use server';

    try {
      const allowed = await ensurePropertyAccess(propertyId);
      if (!allowed) {
        return { success: false, error: 'Unauthorized' };
      }

      const imageUrl = String(formData.get('imageUrl') ?? '');
      const targetRaw = String(formData.get('target') ?? '');
      const target = photoAssignmentTargetSchema.parse(targetRaw);

      const propertyData = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { pageContent: true },
      });

      if (!propertyData) {
        return {
          success: false,
          error: 'Property not found',
        };
      }

      const parsed = PropertyPageContentSchema.safeParse(propertyData.pageContent);
      const nextContent = parsed.success ? parsed.data : createEmptyPropertyPageContent();
      const { title } = resolvePhotoTarget(target);

      switch (target) {
        case 'homePage:hero':
          nextContent.homepage.hero.image = imageUrl;
          break;
        case 'homePage:amenities':
          nextContent.homepage.amenities.image = imageUrl;
          break;
        case 'laPropiedad:groundFloor':
          nextContent.laPropiedad.groundFloor.image = imageUrl;
          break;
        case 'laPropiedad:firstFloor':
          nextContent.laPropiedad.firstFloor.image = imageUrl;
          break;
        case 'laPropiedad:exterior':
          nextContent.laPropiedad.exterior.image = imageUrl;
          break;
        case 'turismo:queHacer':
          nextContent.turismo.queHacer.push({ image: imageUrl, title });
          break;
        case 'turismo:queVisitar':
          nextContent.turismo.queVisitar.push({ image: imageUrl, title });
          break;
        case 'turismo:queComer':
          nextContent.turismo.queComer.push({ image: imageUrl, title });
          break;
        case 'reservas:instructions':
          nextContent.reservas.hero.image = imageUrl;
          break;
        case 'tarifas:temporadaAlta':
        case 'tarifas:temporadaMedia':
        case 'tarifas:temporadaBaja':
        case 'tarifas:politicas':
          nextContent.tarifas.offers.push({ image: imageUrl, title });
          break;
        case 'contacto:general':
          nextContent.contacto.hero.image = imageUrl;
          break;
      }

      const validatedPageContent = PropertyPageContentSchema.parse(nextContent);

      await prisma.property.update({
        where: { id: propertyId },
        data: {
          pageContent: validatedPageContent,
        },
      });

      revalidatePath(`/admin/properties/${propertyId}/fotos`);
      revalidatePath(`/admin/properties/${propertyId}/contenidos`);
      revalidatePath(`/properties/${propertySlug}`);
      revalidatePath(`/properties/${propertySlug}/la-propiedad`);
      revalidatePath(`/properties/${propertySlug}/turismo`);
      revalidatePath(`/properties/${propertySlug}/reservas`);
      revalidatePath(`/properties/${propertySlug}/tarifas`);
      revalidatePath(`/properties/${propertySlug}/contacto`);

      return {
        success: true,
        message: 'Imagen anadida a la seccion seleccionada.',
      };
    } catch (error) {
      console.error('assignPhotoAction error:', error);
      return {
        success: false,
        error: 'Error asignando imagen a la seccion',
      };
    }
  }

  async function diagnoseEnvAction(
    _state: { success: boolean; error?: string; message?: string; details?: string[] },
    _formData: FormData
  ) {
    'use server';

    try {
      const allowed = await ensurePropertyAccess(propertyId);
      if (!allowed) {
        return { success: false, error: 'Unauthorized' };
      }

      const supabaseUrlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleRaw = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const bucketRaw = process.env.SUPABASE_STORAGE_BUCKET;

      const supabaseUrl = normalizeSupabaseUrl(supabaseUrlRaw);
      const serviceRole = normalizeEnvValue(serviceRoleRaw);
      const bucket = normalizeEnvValue(bucketRaw) || 'property-media';

      const details: string[] = [];

      details.push(supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL: OK' : 'NEXT_PUBLIC_SUPABASE_URL: INVALIDA O AUSENTE');
      details.push(serviceRole ? 'SUPABASE_SERVICE_ROLE_KEY: PRESENTE' : 'SUPABASE_SERVICE_ROLE_KEY: AUSENTE');
      details.push(
        serviceRole.length >= 30
          ? 'SUPABASE_SERVICE_ROLE_KEY (longitud): OK'
          : 'SUPABASE_SERVICE_ROLE_KEY (longitud): DEMASIADO CORTA'
      );

      const bucketValid = /^[a-z0-9][a-z0-9-_]{1,62}$/.test(bucket);
      details.push(bucketValid ? `SUPABASE_STORAGE_BUCKET: OK (${bucket})` : `SUPABASE_STORAGE_BUCKET: INVALIDO (${bucket})`);

      const storageChecksOk = Boolean(supabaseUrl && serviceRole && serviceRole.length >= 30);
      let bucketExists = false;
      let storageReachable = false;

      if (storageChecksOk) {
        try {
          const supabase = createClient(supabaseUrl!, serviceRole, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          });

          const bucketsResult = await supabase.storage.listBuckets();
          if (bucketsResult.error) {
            details.push(`Storage API: ERROR (${bucketsResult.error.message})`);
          } else {
            storageReachable = true;
            details.push('Storage API: OK');
            bucketExists = (bucketsResult.data ?? []).some((item) => item.name === bucket);
            details.push(
              bucketExists
                ? `Bucket existe: SI (${bucket})`
                : `Bucket existe: NO (${bucket})`
            );
          }
        } catch (error) {
          details.push(
            `Storage API: ERROR (${error instanceof Error ? error.message : 'Unknown error'})`
          );
        }
      } else {
        details.push('Storage API: OMITIDO (config base incompleta)');
      }

      const canUpload = Boolean(
        supabaseUrl &&
          serviceRole &&
          serviceRole.length >= 30 &&
          bucketValid &&
          storageReachable &&
          bucketExists
      );

      return {
        success: canUpload,
        message: canUpload
          ? 'Diagnostico correcto: la configuracion parece valida para subida de imagenes.'
          : 'Diagnostico incompleto: revisa las variables marcadas abajo.',
        details,
      };
    } catch (error) {
      console.error('diagnoseEnvAction error:', error);
      return {
        success: false,
        error: 'No se pudo ejecutar el diagnostico',
      };
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Fotos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Sube imagenes, copia su URL o asignalas a una seccion de tu contenido publico.
        </p>
      </div>

      <PhotoGalleryManager
        propertyId={property.id}
        imageUrls={property.imageUrls}
        uploadAction={uploadPhotoAction}
        assignAction={assignPhotoAction}
        diagnoseAction={diagnoseEnvAction}
      />
    </section>
  );
}
