import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-2xl shadow-xl overflow-hidden modal-enter`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-red-200/40 dark:border-red-950/40 bg-red-50/40 dark:bg-[#200808]">
          <h3 className="text-sm font-bold text-[#450a0a] dark:text-[#fef2f2] tracking-tight">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana modal"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-[#2c0b0b] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 max-h-[85vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
