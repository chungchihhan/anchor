import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

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
  const [editedSummary, setEditedSummary] = useState(summary);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditedSummary(summary);
  }, [summary, isOpen]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Add ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isOpen, editedSummary, summary]);

  if (!isOpen) return null;

  const hasChanges = editedSummary !== summary;

  const handleSave = () => {
    onSave(editedSummary);
    onClose();
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowConfirmDialog(false);
    onClose();
  };

  const handleCancelClose = () => {
    setShowConfirmDialog(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <div
          className="bg-black/90 border border-white/10 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl"
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
              {hasChanges && (
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-400/50 rounded text-sm text-white transition-all flex items-center gap-1"
                >
                  Save Changes
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

          {/* Content - Always editable */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <textarea
              ref={textareaRef}
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              className="w-full h-full min-h-[400px] bg-white/5 border border-white/10 rounded-lg p-4 text-white font-mono text-sm resize-none focus:outline-none focus:border-cyan-500/50"
              placeholder="Enter summary in markdown..."
            />
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div 
            className="bg-black/90 border border-white/10 rounded-xl p-6 max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-medium mb-3">Unsaved Changes</h3>
            <p className="text-white/70 mb-6">
              You have unsaved changes. Do you want to save them before closing?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleConfirmClose}
                className="px-4 py-2 text-white/60 hover:text-white transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleCancelClose}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleSave();
                  setShowConfirmDialog(false);
                }}
                className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-400/50 rounded text-white transition-all"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}