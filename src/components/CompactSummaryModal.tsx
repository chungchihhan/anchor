import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface CompactSummaryModalProps {
  isOpen: boolean;
  summary: string;
  summaryUpToIndex: number;
  onSave: (newSummary: string) => void;
  onClose: () => void;
}

export function CompactSummaryModal({
  isOpen,
  summary,
  summaryUpToIndex,
  onSave,
  onClose
}: CompactSummaryModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState(summary);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditedSummary(summary);
    setIsEditing(false); // Reset editing state when modal opens
  }, [summary, isOpen]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(editedSummary);
    setIsEditing(false);
  };

  const handleClose = () => {
    setIsEditing(false); // Reset editing state when closing
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div>
            <h2 className="text-white font-medium">Compact Summary</h2>
            <p className="text-xs text-white/50 mt-1">
              Summarizes messages 1-{summaryUpToIndex + 1}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 rounded text-sm text-white transition-all"
              >
                Edit
              </button>
            )}
            {isEditing && (
              <button
                onClick={handleSave}
                className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-400/50 rounded text-sm text-white transition-all"
              >
                Save
              </button>
            )}
            <button
              onClick={handleClose}
              className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-md"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              className="w-full h-full min-h-[400px] bg-white/5 border border-white/10 rounded-lg p-4 text-white font-mono text-sm resize-none focus:outline-none focus:border-cyan-500/50"
              placeholder="Enter summary in markdown..."
            />
          ) : (
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
