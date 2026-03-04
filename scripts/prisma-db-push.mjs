#!/usr/bin/env node
// scripts/prisma-db-push.mjs
// Wrapper para ejecutar `prisma db push` en un proyecto ESM

import { spawnSync } from 'child_process';

const result = spawnSync('prisma', ['db', 'push'], {
  stdio: 'inherit',
  cwd: process.cwd(),
});

process.exit(result.status || 0);
