import { MessageSquare, Settings, Plus } from 'lucide-react';

interface SidebarProps {
    onOpenSettings: () => void;
    onNewChat: () => void;
}

export function Sidebar({ onOpenSettings, onNewChat }: SidebarProps) {
    return (
        <aside className="h-full w-[260px] flex flex-col glass-panel border-r border-white/10">
            <div className="p-4">
                <button
                    onClick={onNewChat}
                    className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                >
                    <Plus size={20} />
                    New Chat
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                <div className="px-2 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Recent
                </div>
                {/* Placeholder for history items */}
                <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-gray-300 truncate transition-colors">
                    <div className="flex items-center gap-2">
                        <MessageSquare size={16} className="opacity-70" />
                        <span>Welcome to Anchor</span>
                    </div>
                </button>
            </div>

            <div className="p-4 border-t border-white/10">
                <button
                    onClick={onOpenSettings}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-gray-300 transition-colors"
                >
                    <Settings size={18} />
                    <span>Settings</span>
                </button>
            </div>
        </aside>
    );
}
