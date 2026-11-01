import { writeFile } from 'node:fs/promises';
import { exportLayout } from '../web/dist/keymap-export.js';
await writeFile(new URL('../web/dist/edge-info.json', import.meta.url), JSON.stringify(exportLayout(),null,2)+'\n');
