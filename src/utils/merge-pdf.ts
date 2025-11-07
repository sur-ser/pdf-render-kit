import { PDFDocument } from 'pdf-lib';

export async function mergePdf(buffers: Buffer[]): Promise<Buffer> {
    if (buffers.length === 1) return buffers[0];
    const out = await PDFDocument.create();

    for (const buf of buffers) {
        const doc = await PDFDocument.load(buf);
        const pages = await out.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => out.addPage(p));
    }
    const bytes = await out.save();
    return Buffer.from(bytes);
}