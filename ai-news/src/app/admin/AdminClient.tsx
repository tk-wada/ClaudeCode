'use client'

import { useState, useEffect, useCallback } from 'react'
import { CATEGORIES, Category } from '@/types'
import { cn } from '@/lib/utils'

interface NewsItem {
  id: string
  title: string
  url: string
  summary: string
  category: Category
  publishedAt: string
  isVisible: boolean
  isManual: boolean
  aiComment: string | null
  _count: { comments: number }
}

function formatDateJP(date: string): string {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function AdminClient() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    url: '',
    summary: '',
    category: Category.GENERAL,
    publishedAt: new Date().toISOString().slice(0, 16),
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchNews = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/news?page=${page}&limit=20&includeHidden=true`)
      const data = await res.json()
      setNews(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setError('ニュースの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'エラーが発生しました')
      } else {
        setSuccess('ニュースを追加しました')
        setForm({
          title: '',
          url: '',
          summary: '',
          category: Category.GENERAL,
          publishedAt: new Date().toISOString().slice(0, 16),
        })
        fetchNews()
      }
    } finally {
      setSaving(false)
    }
  }

  async function toggleVisibility(id: string, isVisible: boolean) {
    await fetch(`/api/news/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible: !isVisible }),
    })
    fetchNews()
  }

  async function deleteNews(id: string) {
    if (!confirm('このニュースを削除しますか？')) return
    await fetch(`/api/news/${id}`, { method: 'DELETE' })
    fetchNews()
  }

  async function generateComment(id: string) {
    setGeneratingId(id)
    try {
      await fetch(`/api/news/${id}/generate-comment`, { method: 'POST' })
      fetchNews()
    } finally {
      setGeneratingId(null)
    }
  }

  const categoryLabel = (cat: Category) =>
    CATEGORIES.find((c) => c.id === cat)?.label || cat

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">管理画面</h1>

      {/* 手動追加フォーム */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">ニュースを手動追加</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm">
            {success}
          </div>
        )}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ニュースのタイトル"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              required
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://..."
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              要約 <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="ニュースの要約（2〜3文）"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              カテゴリ <span className="text-red-500">*</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">公開日時</label>
            <input
              type="datetime-local"
              value={form.publishedAt}
              onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '追加中...' : 'ニュースを追加'}
            </button>
          </div>
        </form>
      </div>

      {/* ニュース一覧 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            ニュース一覧{' '}
            <span className="text-sm text-gray-500 font-normal">（全 {total} 件）</span>
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">読み込み中...</div>
        ) : news.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">ニュースがありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">タイトル</th>
                  <th className="px-4 py-3 text-left font-medium w-24">カテゴリ</th>
                  <th className="px-4 py-3 text-left font-medium w-32">公開日</th>
                  <th className="px-4 py-3 text-center font-medium w-20">表示</th>
                  <th className="px-4 py-3 text-center font-medium w-20">コメント</th>
                  <th className="px-4 py-3 text-center font-medium w-40">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {news.map((item) => (
                  <tr
                    key={item.id}
                    className={cn('hover:bg-gray-50 transition-colors', !item.isVisible && 'opacity-50')}
                  >
                    <td className="px-4 py-3">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline line-clamp-2 font-medium"
                      >
                        {item.title}
                      </a>
                      {item.isManual && (
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                          手動
                        </span>
                      )}
                      {item.aiComment && (
                        <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          AI済
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {categoryLabel(item.category)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatDateJP(item.publishedAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleVisibility(item.id, item.isVisible)}
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium transition-colors',
                          item.isVisible
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        )}
                      >
                        {item.isVisible ? '表示中' : '非表示'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">
                      {item._count?.comments ?? 0} 件
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => generateComment(item.id)}
                          disabled={generatingId === item.id}
                          title="AIコメント生成"
                          className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 px-2 py-1 rounded transition-colors whitespace-nowrap"
                        >
                          {generatingId === item.id ? '生成中...' : 'AIコメント'}
                        </button>
                        <button
                          onClick={() => deleteNews(item.id)}
                          className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded transition-colors"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {(page - 1) * 20 + 1}〜{Math.min(page * 20, total)} 件目 / 全 {total} 件
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                前へ
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                次へ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
