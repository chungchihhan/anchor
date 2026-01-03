import { ChatSession } from '@/types';
import { invoke } from '@tauri-apps/api/core';

export class HistoryService {
    static async saveToLocal(session: ChatSession): Promise<void> {
        if (typeof window === 'undefined') return;
        try {
            await invoke('save_chat', { session });
        } catch (error) {
            console.error('Failed to save chat:', error);
            throw error;
        }
    }

    static async listLocal(): Promise<ChatSession[]> {
        if (typeof window === 'undefined') return [];
        try {
            return await invoke('list_chats');
        } catch (error) {
            console.error('Failed to list chats:', error);
            return [];
        }
    }

    static async loadLocal(id: string): Promise<ChatSession> {
        try {
            return await invoke('load_chat', { id });
        } catch (error) {
            console.error('Failed to load chat:', error);
            throw error;
        }
    }

    static async deleteLocal(id: string): Promise<void> {
        console.log('HistoryService.deleteLocal invoking delete_chat with id:', id);
        try {
            await invoke('delete_chat', { id });
            console.log('HistoryService.deleteLocal invoked successfully');
        } catch (error) {
            console.error('Failed to delete chat:', error);
            throw error;
        }
    }
}
