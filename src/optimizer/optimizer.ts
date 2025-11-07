import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { OptimizerConfig } from '../types';

function execCmd(cmd: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const p = spawn(cmd, args, { stdio: 'ignore' });
        p.on('error', reject);
        p.on('close', (code) => code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`)));
    });
}

export async function optimizePdfIfEnabled(input: Buffer, cfg: OptimizerConfig): Promise<Buffer> {
    if (!cfg.enabled) return input;

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-opt-'));
    const inPath = path.join(tmpDir, 'in.pdf');
    const outPath = path.join(tmpDir, 'out.pdf');
    await fs.writeFile(inPath, input);

    try {
        if (cfg.method === 'ghostscript') {
            const preset = cfg.gsPreset ?? '/ebook';
            const args = [
                '-sDEVICE=pdfwrite',
                `-dPDFSETTINGS=${preset}`,
                '-dNOPAUSE',
                '-dBATCH',
                '-dQUIET',
                '-dCompatibilityLevel=1.5',
                `-sOutputFile=${outPath}`,
                inPath
            ];
            await execCmd('gs', args);
        } else if (cfg.method === 'qpdf') {
            const args = ['--object-streams=generate', '--compress-streams=y', inPath, outPath];
            await execCmd('qpdf', args);
        } else if (cfg.method === 'mutool') {
            // MuPDF: cleaning and compression
            await execCmd('mutool', ['clean', '-gggg', inPath, outPath]);
        } else if (cfg.method === 'custom' && cfg.commandTemplate) {
            const cmdline = cfg.commandTemplate.replace('{in}', inPath).replace('{out}', outPath);
            const [cmd, ...rest] = cmdline.split(' ');
            await execCmd(cmd, rest);
        } else {
            // unknown method — return as is
            return input;
        }
        return await fs.readFile(outPath);
    } catch {
        // If optimization failed — return original without crashing the task
        return input;
    } finally {
        // Always clean temporary files — do not clutter the system
        try {
            await fs.rm(tmpDir, { recursive: true, force: true });
        } catch {
            // ignore
        }
    }
}