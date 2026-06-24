'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type = 'success', onClose, duration = 2500 }: ToastProps) {
  const [isRendered, setIsRendered] = useState(false)

  useEffect(() => {
    // Trigger transition animation on mount
    const animationFrame = requestAnimationFrame(() => {
      setIsRendered(true)
    })

    const timer = setTimeout(() => {
      setIsRendered(false)
      const exitTimer = setTimeout(onClose, 300)
      return () => clearTimeout(exitTimer)
    }, duration)

    return () => {
      cancelAnimationFrame(animationFrame)
      clearTimeout(timer)
    }
  }, [onClose, duration])

  const handleClose = () => {
    setIsRendered(false)
    setTimeout(onClose, 300)
  }

  const bgColor = type === 'success'
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : 'bg-rose-50 text-rose-800 border-rose-200'

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm w-[90%] sm:w-auto transition-all duration-300 ${bgColor} ${
        isRendered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-center gap-2">
        {type === 'success' ? (
          <svg className="size-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="size-5 text-rose-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <span className="text-sm font-semibold pr-2 leading-tight">{message}</span>
      </div>

      <button
        onClick={handleClose}
        className="size-11 flex items-center justify-center -my-3 -mr-3 text-current opacity-60 hover:opacity-100 transition-opacity focus:outline-none cursor-pointer"
        aria-label="Đóng"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
