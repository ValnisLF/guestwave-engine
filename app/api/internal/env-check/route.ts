import { NextRequest, NextResponse } from 'next/server';

function normalizeEnvValue(value: string | undefined) {
  if (!value) return '';
  const trimmed = value.trim();
  return trimmed.replace(/^['\"]|['\"]$/g, '');
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isAuthorized(request: NextRequest): boolean {
  const healthToken = process.env.HEALTHCHECK_TOKEN;
  const providedHealthToken = request.headers.get('x-healthcheck-token');
  if (healthToken && providedHealthToken === healthToken) {
    return true;
  }

  const configuredToken = process.env.ICAL_AUTO_SYNC_TOKEN;
  const providedToken = request.headers.get('x-ical-auto-sync-token');
  if (configuredToken && providedToken === configuredToken) {
    return true;
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return process.env.NODE_ENV !== 'production';
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRole = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const storageBucket = normalizeEnvValue(process.env.SUPABASE_STORAGE_BUCKET) || 'property-media';

  const checks = {
    nextPublicSupabaseUrl: {
      present: supabaseUrl.length > 0,
      validHttpUrl: isValidHttpUrl(supabaseUrl),
    },
    supabaseServiceRoleKey: {
      present: serviceRole.length > 0,
      minLengthOk: serviceRole.length >= 30,
    },
    supabaseStorageBucket: {
      value: storageBucket,
      validName: /^[a-z0-9][a-z0-9-_]{1,62}$/.test(storageBucket),
    },
  };

  const ok =
    checks.nextPublicSupabaseUrl.present &&
    checks.nextPublicSupabaseUrl.validHttpUrl &&
    checks.supabaseServiceRoleKey.present &&
    checks.supabaseServiceRoleKey.minLengthOk &&
    checks.supabaseStorageBucket.validName;

  return NextResponse.json(
    {
      ok,
      area: 'image-upload-and-page-content',
      checks,
      note: 'No secrets are returned by this endpoint. It only reports presence and format checks.',
    },
    { status: ok ? 200 : 503 }
  );
}
