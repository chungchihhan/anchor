import { Message, ChatSession } from '@/types';

export interface HistoryFile {
    name: string;
    path: string;
    createdAt: string;
}

export class HistoryService {
    static async saveToLocal(session: ChatSession): Promise<void> {
        await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(session),
        });
    }

    static async listLocal(): Promise<ChatSession[]> {
        const res = await fetch('/api/history');
        if (!res.ok) throw new Error('Failed to list history');
        return res.json();
    }

    static async loadLocal(id: string): Promise<ChatSession> {
        const res = await fetch(`/api/history/${id}`);
        if (!res.ok) throw new Error('Failed to load history');
        return res.json();
    }

    static async deleteLocal(id: string): Promise<void> {
        const res = await fetch(`/api/history/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete history');
    }
}
