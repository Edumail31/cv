// Resume Parser - Extract text from PDF, DOCX, and Images
// Using pdf-parse v1.1.1 which doesn't require canvas dependencies
import mammoth from 'mammoth';

export interface ParsedResume {
    text: string;
    format: 'pdf' | 'docx' | 'image' | 'text';
    error?: string;
}

// Parse PDF file using pdf-parse v1 (no canvas dependency)
export async function parsePDF(buffer: Buffer): Promise<ParsedResume> {
    try {
        console.log('[PDF Parser] Starting PDF parse, buffer size:', buffer.length);

        // pdf-parse v1.1.1 uses CommonJS require
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse');

        const data = await pdfParse(buffer);
        console.log('[PDF Parser] Successfully extracted text, length:', data.text?.length || 0);

        if (!data.text || data.text.trim().length === 0) {
            return {
                text: '',
                format: 'pdf',
                error: 'No text content found in PDF. The PDF may be image-based.'
            };
        }

        return {
            text: data.text,
            format: 'pdf'
        };
    } catch (error) {
        console.error('[PDF Parser] Error:', error);
        return {
            text: '',
            format: 'pdf',
            error: 'Failed to parse PDF: ' + (error as Error).message
        };
    }
}

// Parse DOCX file
export async function parseDOCX(buffer: Buffer): Promise<ParsedResume> {
    try {
        console.log('[DOCX Parser] Starting DOCX parse, buffer size:', buffer.length);

        // Convert Buffer to ArrayBuffer for mammoth
        const arrayBuffer = buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
        ) as ArrayBuffer;

        // Try with arrayBuffer first (more reliable in Next.js)
        let result;
        try {
            result = await mammoth.extractRawText({ arrayBuffer });
        } catch {
            // Fallback to buffer if arrayBuffer fails
            console.log('[DOCX Parser] ArrayBuffer failed, trying buffer...');
            result = await mammoth.extractRawText({ buffer });
        }

        if (!result.value || result.value.trim().length === 0) {
            console.warn('[DOCX Parser] No text extracted from DOCX');
            return {
                text: '',
                format: 'docx',
                error: 'No text content found in DOCX file'
            };
        }

        console.log('[DOCX Parser] Successfully extracted text, length:', result.value.length);
        return {
            text: result.value,
            format: 'docx'
        };
    } catch (error) {
        console.error('[DOCX Parser] Error:', error);
        return {
            text: '',
            format: 'docx',
            error: 'Failed to parse DOCX: ' + (error as Error).message
        };
    }
}

// Parse file based on type
export async function parseResume(buffer: Buffer, filename: string): Promise<ParsedResume> {
    const ext = filename.toLowerCase().split('.').pop();
    console.log(`[Resume Parser] Parsing file: ${filename}, extension: ${ext}`);

    switch (ext) {
        case 'pdf':
            return parsePDF(buffer);
        case 'docx':
        case 'doc':
            return parseDOCX(buffer);
        case 'txt':
            return {
                text: buffer.toString('utf-8'),
                format: 'text'
            };
        case 'png':
        case 'jpg':
        case 'jpeg':
            // For images, we'll handle OCR via AI vision
            return {
                text: '',
                format: 'image',
                error: 'Image files require OCR processing'
            };
        default:
            return {
                text: '',
                format: 'text',
                error: `Unsupported file type: ${ext}`
            };
    }
}
