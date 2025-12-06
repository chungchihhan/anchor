import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CHATS_DIR = path.join(process.cwd(), 'chats');

// Ensure directory exists
if (!fs.existsSync(CHATS_DIR)) {
    fs.mkdirSync(CHATS_DIR);
}

export async function GET() {
    try {
        const files = fs.readdirSync(CHATS_DIR).filter(file => file.endsWith('.json'));
        
        const sessions = files.map(file => {
            try {
                const filePath = path.join(CHATS_DIR, file);
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(fileContent);
                
                // Check if it's a new format ChatSession
                if (data.id && data.title && Array.isArray(data.messages)) {
                    return {
                        id: data.id,
                        title: data.title,
                        timestamp: data.timestamp || fs.statSync(filePath).birthtimeMs,
                        filename: file // For debugging or fallback
                    };
                }
                
                // Legacy format (Message[]) fallback
                if (Array.isArray(data)) {
                    return {
                        id: file.replace('.json', ''),
                        title: file.replace('.json', '').replace(/^chat_/, '').replace(/_/g, ' '),
                        timestamp: fs.statSync(filePath).birthtimeMs,
                        legacy: true,
                         filename: file
                    };
                }
                
                return null;
            } catch (e) {
                return null;
            }
        }).filter(Boolean).sort((a: any, b: any) => b.timestamp - a.timestamp);
        
        return NextResponse.json(sessions);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to list history' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await request.json();
        
        // Ensure ID exists
        const id = session.id || `chat_${Date.now()}`;
        const filename = `${id}.json`;
        const filepath = path.join(CHATS_DIR, filename);

        // Save entire session object including metadata
        fs.writeFileSync(filepath, JSON.stringify(session, null, 2));

        return NextResponse.json({ success: true, id });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
    }
}
