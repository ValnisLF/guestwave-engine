#!/bin/bash
# postinstall.sh
# Aplica parches necesarios tras npm install

if [ -f "patches/prisma-dev.patch" ]; then
  echo "Aplicando patch de @prisma/dev para soporte ESM..."
  patch -p0 < patches/prisma-dev.patch
fi
