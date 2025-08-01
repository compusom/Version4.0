#!/bin/bash

# Inicia el backend en una terminal separada
if command -v gnome-terminal &> /dev/null; then
  gnome-terminal -- bash -c "cd server && node index.js; exec bash"
else
  x-terminal-emulator -e "bash -c 'cd server && node index.js; exec bash'" &
fi

# Inicia el frontend en la terminal actual
npm run dev
