import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CHATS_DIR = path.join(process.cwd(), 'chats');

export async function GET(
    request: Request,
    { params }: { params: Promise<{ filename: string }> }
) {
    try {
        const { filename: rawFilename } = await params;
        // Filename is essentially the ID.json if new, or checking legacy name
        let filename = rawFilename;
        if (!filename.endsWith('.json')) filename += '.json';
        
        const filepath = path.join(CHATS_DIR, filename);

        if (!fs.existsSync(filepath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const fileContent = fs.readFileSync(filepath, 'utf-8');
        const data = JSON.parse(fileContent);

        // Normalize return. If it's legacy (array), wrap it in session structure temporarily for client usage?
        // Actually, client expects `ChatSession` from `loadLocal`. 
        if (Array.isArray(data)) {
            return NextResponse.json({
                id: rawFilename.replace('.json', ''),
                title: rawFilename,
                timestamp: Date.now(), // Fallback
                messages: data
             });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to read history' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ filename: string }> }
) {
    try {
        const { filename: rawFilename } = await params;
        let filename = rawFilename;
        if (!filename.endsWith('.json')) filename += '.json';
        
        const filepath = path.join(CHATS_DIR, filename);

        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 });
    }
}
