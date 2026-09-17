"use client";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
  isDanger?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText,
  onConfirm,
  onClose,
  isDanger = true,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-zinc-200 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${
              isDanger ? "bg-red-50 text-red-600 border border-red-200" : "bg-red-50 text-red-600 border border-red-200"
            }`}>
              ⚠️
            </div>
            <h3 className="text-xl font-semibold text-zinc-900">{title}</h3>
          </div>
          
          <p className="text-sm text-zinc-600 leading-relaxed">{message}</p>
        </div>

        <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-3">
          {cancelText && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 transition-all"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full px-5 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition-all shadow-sm shadow-red-600/20 active:scale-95"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
