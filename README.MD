

# pdf-render-kit

<p align="center">
  <a href="https://www.npmjs.com/package/pdf-render-kit"><img alt="npm version" src="https://img.shields.io/npm/v/pdf-render-kit?logo=npm&amp;label=npm&amp;color=cb0000"></a>
  <a href="https://www.npmjs.com/package/pdf-render-kit"><img alt="npm downloads" src="https://img.shields.io/npm/dm/pdf-render-kit?logo=npm"></a>
  <a href="https://github.com/sur-ser/pdf-render-kit"><img alt="GitHub stars" src="https://img.shields.io/github/stars/sur-ser/pdf-render-kit?style=social"></a>
  <a href="https://github.com/sur-ser/pdf-render-kit/issues"><img alt="GitHub issues" src="https://img.shields.io/github/issues/sur-ser/pdf-render-kit?logo=github"></a>
  <a href="https://github.com/sur-ser/pdf-render-kit"><img alt="GitHub repo" src="https://img.shields.io/badge/Repo-pdf--render--kit-6f42c1?logo=github"></a>
  <a href="#license"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg"></a>
</p>

Render high-quality, **small** PDFs from **URL** or **raw HTML** using Playwright (Chromium).  
Waits for **images, webfonts, lazy content**, supports **multiple sources** (auto-merge), **retries**, a **lightweight local in-memory queue** with configurable concurrency, and optional **post-optimization** via **Ghostscript**, **qpdf**, **MuPDF (mutool)**, or your **custom command**.

> This package is a **library**. You can wire it into your own services and (if you want) plug in any external queue (RabbitMQ, BullMQ, SQS, etc.). A built-in **local** queue is included for convenience.

## Links

- **npm**: https://www.npmjs.com/package/pdf-render-kit  
- **GitHub repo**: https://github.com/sur-ser/pdf-render-kit  
- **Issues**: https://github.com/sur-ser/pdf-render-kit/issues  
- **Repository**: https://github.com/sur-ser/pdf-render-kit

---

## Highlights

- **URL & HTML** sources (with `baseUrl` support): the renderer injects `<base href=…>` so relative assets resolve correctly.
- **Deterministic readiness**: auto-scrolls for lazy content, waits for images & fonts, supports `waitUntil` and optional selectors.
- **Small PDFs**: sensible defaults (`preferCSSPageSize`, optional `printBackground` off), plus **post-optimization** via GS/qpdf/mutool/custom.
- **Local in-memory queue** with **concurrency control** and **retries**.
- **Single write** policy: only the service writes the final PDF file (no intermediate files).
- **TypeScript first**, clean OOP, KISS/SOLID-ish internals, documented APIs.

---

## Installation

```bash
npm i pdf-render-kit
# Playwright will fetch Chromium on postinstall. If you use slim containers,
# prefer a Playwright base image or run: npx playwright install --with-deps
```

**Node**: 18+ recommended.

---

## Quick start

```ts
import { PdfRenderService, type Source } from 'pdf-render-kit';

const service = new PdfRenderService({
  defaultPdfOptions: {
    format: 'A4',
    emulateMedia: 'screen',
    waitUntil: 'networkidle',
    printBackground: false,
    settleMs: 800,
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    outputPath: './out/first.pdf'
  },
  optimizer: { enabled: true, method: 'ghostscript', gsPreset: '/ebook' }, // optional
  concurrency: 2
});

const sources: Source[] = [
  { url: 'https://example.com' },
  {
    html: `<html><body><h1>Hello</h1>
           <img src="https://placekitten.com/1000/600"/></body></html>`,
    baseUrl: 'https://placekitten.com'
  }
];

await service.render(sources, { outputPath: './out/merged.pdf' });
```

---

## Examples

### 1) Render from a URL
```ts
await service.render([{ url: 'https://example.com/invoice/123' }], {
  format: 'A4',
  outputPath: './out/invoice-123.pdf'
});
```

### 2) Render from raw HTML + `baseUrl`
```ts
await service.render([{
  html: '<!doctype html><body><img src="/img/logo.png">Hi</body>',
  baseUrl: 'https://cdn.example.com'
}], { outputPath: './out/from-html.pdf' });
```

### 3) Multiple sources → one PDF (auto-merge)
```ts
await service.render(
  [{ url: 'https://example.com/pg1' }, { url: 'https://example.com/pg2' }],
  { outputPath: './out/two-pages.pdf' }
);
```

### 4) Local in-memory queue (no external infra)
```ts
// enqueue jobs; they will execute with configured concurrency
service.enqueueLocal({
  sources: [{ url: 'https://example.com/a' }],
  outputPath: './out/a.pdf',
  retry: { maxAttempts: 3, backoffMs: 1500 }
});

service.enqueueLocal({
  sources: [{ url: 'https://example.com/b' }],
  outputPath: './out/b.pdf'
});

console.log(service.queueStats()); // { active: N, queued: M, concurrency: 2 }
```

### 5) Executing a job object directly (useful with your own queue)
```ts
const result = await service.executeJob({
  sources: [{ url: 'https://example.com/report' }],
  options: { format: 'A4', printBackground: false },
  outputPath: './out/report.pdf',
  retry: { maxAttempts: 3, backoffMs: 1500 } // optional
});
console.log(result); // { id, outputPath }
```

### 6) Wiring an external queue (pseudo-code)

**RabbitMQ** or **BullMQ** can drive `executeJob(job)`:

```ts
// Pseudo: on message received from your queue
queue.process(async (msg) => {
  const job = JSON.parse(msg.content);
  try {
    const res = await service.executeJob(job); // { id, outputPath }
    // ack success
  } catch (e) {
    // handle retry/ack/nack according to your queue policy
  }
});
```

---

## API

### Types

```ts
type Source =
  | { url: string; html?: never; baseUrl?: string }
  | { html: string; url?: never; baseUrl?: string };

type PdfSingleOptions = {
  outputPath?: string;
  format?: 'A4' | 'Letter' | 'Legal';
  width?: string;
  height?: string;
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
  printBackground?: boolean;
  scale?: number;
  emulateMedia?: 'screen' | 'print';
  viewport?: { width: number; height: number; deviceScaleFactor?: number };
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  waitForSelectors?: string[];
  timeoutMs?: number;
  settleMs?: number;
  cookies?: Array<{
    name: string; value: string; domain?: string; path?: string;
    httpOnly?: boolean; secure?: boolean; sameSite?: 'Lax' | 'Strict' | 'None'; expires?: number;
  }>;
};

type OptimizerMethod = 'ghostscript' | 'qpdf' | 'mutool' | 'custom';

type OptimizerConfig = {
  enabled: boolean;
  method?: OptimizerMethod;
  commandTemplate?: string;        // for 'custom', with {in}/{out}
  gsPreset?: '/screen' | '/ebook' | '/printer' | '/prepress';
};

type LibraryConfig = {
  navigationTimeoutMs?: number;
  concurrency?: number;            // local queue + browser lifecycle
  defaultPdfOptions?: PdfSingleOptions;
  optimizer?: OptimizerConfig;
};

type PdfJob = {
  id?: string;                     // generated if omitted
  sources: Source[];
  options?: PdfSingleOptions;
  retry?: { maxAttempts: number; backoffMs: number };
  outputPath?: string;             // final output path (recommended)
  meta?: Record<string, any>;
};
```

### Class: `PdfRenderService`

```ts
new PdfRenderService(config: LibraryConfig, storage?: JobStatusStorage)
```

- `config`: library configuration (see **Configuration**).
- `storage` (optional): status sink; default is in-memory.

**Methods**

- `render(sources: Source[], options?: PdfSingleOptions): Promise<Buffer>`  
  Renders 1..N sources, merges if N>1, optionally writes **one** final file (`options.outputPath`), returns the (optionally optimized) PDF buffer.

- `executeJob(job: PdfJob): Promise<{ id: string; outputPath: string }>`  
  Runs a job with built-in retry/backoff. Writes **one** final file. Useful with external queues.

- `enqueueLocal(job: Omit<PdfJob, 'id'> & { id?: string }): Promise<{ id: string; outputPath: string }>`  
  Pushes a job into the **local** in-memory queue (FIFO). Concurrency is controlled by `config.concurrency`.

- `queueStats(): { active: number; queued: number; concurrency: number }`  
  Introspection for the local queue.

- `setConcurrency(n: number): void`  
  Adjust local queue concurrency at runtime.

---

## Configuration

Default config (effective):

```ts
{
  navigationTimeoutMs: 45000,
  concurrency: 2,
  defaultPdfOptions: {
    waitUntil: 'networkidle',
    printBackground: false,
    emulateMedia: 'screen',
    scale: 1,
    timeoutMs: 60000,
    settleMs: 800,
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
  },
  optimizer: {
    enabled: false,
    method: 'ghostscript',
    gsPreset: '/ebook',
    commandTemplate: ''
  }
}
```

**Notes**
- Only the **service** writes the final file (when `outputPath` is provided). The renderer never writes to disk.
- Chromium PDF rendering is used (Playwright); `page.pdf()` requires Chromium.

---

## Post-optimization (Ghostscript / qpdf / MuPDF / custom)

After rendering, you can shrink PDFs further:

- **Ghostscript** (recommended for best size/quality trade-offs)
  - Presets: `'/screen'` (smallest), `'/ebook'` (balanced), `'/printer'`, `'/prepress'`.
  - Install:
    - macOS (Homebrew): `brew install ghostscript`
    - Ubuntu/Debian: `sudo apt-get update && sudo apt-get install -y ghostscript`
    - Alpine: `apk add --no-cache ghostscript`
    - Windows: `winget install ArtifexSoftware.GhostScript`
  - Site: https://ghostscript.com/

- **qpdf** (structure/stream compression; fast, modest gains)
  - Install:
    - macOS: `brew install qpdf`
    - Ubuntu/Debian: `sudo apt-get install -y qpdf`
    - Alpine: `apk add --no-cache qpdf`
  - Repo: https://github.com/qpdf/qpdf

- **MuPDF mutool** (clean/garbage-collect, can help certain PDFs)
  - Install:
    - macOS: `brew install mupdf-tools`
    - Ubuntu/Debian: `sudo apt-get install -y mupdf-tools`
    - Alpine: `apk add --no-cache mupdf`
  - Site: https://mupdf.com/

- **Custom** (any shell command):  
  Provide a `commandTemplate` with `{in}` and `{out}` placeholders. Example:
  ```ts
  optimizer: {
    enabled: true,
    method: 'custom',
    commandTemplate: 'some-pdf-tool --compress {in} {out}'
  }
  ```

**Behavior**: If the chosen optimizer binary is **not** available or fails, the library gracefully returns the **original** PDF buffer (no error).

**Temp files**: Each optimization creates its own unique temp folder (via `fs.mkdtemp`) and **always** cleans it up. Safe for parallel jobs.

---

## Docker

Use the official Playwright image, then add optimizers you want:

```Dockerfile
FROM mcr.microsoft.com/playwright:v1.48.0-jammy

# Optional: shrink PDFs further
RUN apt-get update && apt-get install -y --no-install-recommends \
    ghostscript qpdf mupdf-tools \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Playwright is ready in this base image
CMD ["node", "dist/examples/basic.js"]
```

---

## How readiness works

- `waitUntil: 'networkidle'` by default (Chromium).
- The page is **auto-scrolled** to trigger lazy content.
- All `<img>` elements are awaited (`complete || onload || onerror`).
- Webfonts are awaited (`document.fonts.ready`) when available.
- Optional `waitForSelectors` can block rendering until specific elements are visible.
- Optional `settleMs` adds a small “quiet period” after all of the above.

---

## Performance tips

- Tune `concurrency` to match your CPU/RAM budget. Each job opens a browser context; too many in parallel can increase memory usage.
- Prefer `format` (A4/Letter) over freeform `width/height` unless you need precise pixel control.
- Turn **off** `printBackground` unless the page really needs CSS backgrounds.
- Set `scale` conservatively (1..1.2 often yields good results).
- Use **Ghostscript** `'/ebook'` for a strong size/quality balance.

---

## Troubleshooting

- **Chromium missing**: Use `npx playwright install --with-deps` on your host, or a Playwright base image in Docker.
- **Fonts look wrong**: Make sure required system fonts are present in the container/host.
- **Relative assets break in HTML mode**: pass `baseUrl`; the library injects `<base href="…">` for you.
- **Huge PDFs**: try `printBackground: false`, correct `format`, and enable Ghostscript with `gsPreset: '/ebook'`.
- **SPAs that load forever**: change `waitUntil` or pass a specific `waitForSelectors` that signal readiness.

---

## Security notes

- The renderer visits untrusted pages. Run in containers or sandboxed environments you trust.
- The code starts Chromium headless. If you modify the browser args, understand the implications (`--no-sandbox`, etc.).
- Blocklisting 3rd-party trackers/resources is possible via Playwright routing (not included by default to keep the core simple).

---

## Internals & Directory layout

```
src/
  index.ts                  // public exports
  types.ts                  // public types
  config.ts                 // defaults + merge
  service.ts                // PdfRenderService (render/executeJob/local queue)
  queue/local.queue.ts      // simple in-memory FIFO with concurrency
  renderer/
    browser.manager.ts      // lazy shared browser lifecycle
    playwright.renderer.ts  // all rendering logic
    wait-strategy.ts        // autoscroll, images, fonts, settle, animations
  optimizer/optimizer.ts    // GS/qpdf/mutool/custom, tmp handling
  storage/
    storage.interface.ts    // JobStatusStorage
    in-memory.storage.ts    // default impl
  utils/
    merge-pdf.ts            // pdf-lib merge
    ensure-dir.ts           // mkdir -p
```

---

## License

MIT

---

## Related links

- Playwright: https://playwright.dev/
- pdf-lib (merge): https://github.com/Hopding/pdf-lib
- Ghostscript: https://ghostscript.com/
- qpdf: https://github.com/qpdf/qpdf
- MuPDF (mutool): https://mupdf.com/

---

## Publishing

- **GitHub**: add this README, a license, and a minimal CI (optional).
- **npm**:
  ```bash
  npm run build
  npm publish --access public
  ```