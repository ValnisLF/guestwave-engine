#!/usr/bin/env node
// scripts/prisma-wrapper.cjs
// CJS wrapper para ejecutar prisma db push sin problemas ESM

const { spawn } = require('child_process');
const path = require('path');

const command = process.argv[2] || 'db';
const subcommand = process.argv[3] || 'push';
const args = ['db', 'push'];

if (command === 'pull') {
  args[1] = 'pull';
} else if (command === 'migrate') {
  args[0] = 'migrate';
  args[1] = subcommand || 'dev';
} else if (command === 'studio') {
  args[0] = 'studio';
  args.pop();
}

const child = spawn('node_modules/.bin/prisma', args, {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('Failed to execute prisma:', err);
  process.exit(1);
});
