import { promises as fs } from 'fs';
import * as path from 'path';

export async function ensureDir(filePath: string) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
}