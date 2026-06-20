'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Email hoặc mật khẩu không chính xác!')
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <main className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[#FAF9F5] px-4 relative overflow-hidden">
      {/* Decorative warm blobs */}
      <div className="absolute top-[-20%] left-[-10%] size-96 rounded-full bg-yellow-100/40 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] size-96 rounded-full bg-orange-100/20 blur-3xl" />

      <div className="w-full max-w-[400px] bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(245,208,97,0.06)] border border-[#F3F4F6] relative z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Brand/Logo Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative h-12 w-44 select-none mb-4 flex items-center justify-center">
            <Image
              src="/images/logo.png"
              alt="Ý Nù Quán"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-slate-800 font-extrabold text-xl sm:text-2xl tracking-tight text-center">
            🔐 Đăng nhập Admin
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm text-center mt-1">
            Hệ thống quản lý thực đơn Ý Nù Quán
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* Email input */}
          <div className="flex flex-col">
            <label className="text-slate-500 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider block mb-1.5">
              Email đăng nhập
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="w-full bg-slate-50 border border-slate-200 text-slate-850 rounded-xl px-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:border-[#F5C242] focus:bg-white transition-all duration-200"
            />
          </div>

          {/* Password input */}
          <div className="flex flex-col">
            <label className="text-slate-500 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider block mb-1.5">
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-slate-50 border border-slate-200 text-slate-850 rounded-xl px-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:border-[#F5C242] focus:bg-white transition-all duration-200"
            />
          </div>

          {error && (
            <p className="text-rose-600 text-xs font-semibold bg-rose-50 border border-rose-100 px-4 py-2.5 rounded-xl animate-in shake duration-200">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#F5C242] hover:bg-[#e0b034] disabled:opacity-50 text-slate-800 font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-slate-800" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Đang kết nối...
              </span>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>
      </div>
    </main>
  )
}
