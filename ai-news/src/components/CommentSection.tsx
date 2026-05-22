'use client'

import { useState } from 'react'
import { Comment } from '@/types'

interface CurrentUser {
  id: string
  name: string | null
  image: string | null
}

interface CommentSectionProps {
  newsItemId: string
  comments: Comment[]
  currentUser: CurrentUser | null
}

function formatDateJP(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function CommentSection({
  newsItemId,
  comments: initialComments,
  currentUser,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsItemId, content: content.trim() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'コメントの送信に失敗しました')
      }

      const newComment: Comment = await res.json()
      // Attach current user info optimistically
      const commentWithUser: Comment = {
        ...newComment,
        user: currentUser
          ? {
              id: currentUser.id,
              name: currentUser.name,
              email: null,
              emailVerified: null,
              image: currentUser.image,
              role: 'user',
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          : undefined,
      }
      setComments((prev) => [...prev, commentWithUser])
      setContent('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        コメント ({comments.length})
      </h3>

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-3 mb-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5">
              <div className="flex-shrink-0">
                {comment.user?.image ? (
                  <img
                    src={comment.user.image}
                    alt={comment.user.name ?? 'ユーザー'}
                    className="w-7 h-7 rounded-full"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold">
                    {(comment.user?.name ?? 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-gray-800">
                    {comment.user?.name ?? '匿名'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDateJP(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5 break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New comment form or login prompt */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className="mt-3">
          <div className="flex gap-2.5">
            <div className="flex-shrink-0">
              {currentUser.image ? (
                <img
                  src={currentUser.image}
                  alt={currentUser.name ?? 'ユーザー'}
                  className="w-7 h-7 rounded-full"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold">
                  {(currentUser.name ?? 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="コメントを入力..."
                maxLength={500}
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
              />
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-gray-400">{content.length}/500</span>
                <button
                  type="submit"
                  disabled={!content.trim() || isSubmitting}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? '送信中...' : 'コメントする'}
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-600 mt-1">{error}</p>
              )}
            </div>
          </div>
        </form>
      ) : (
        <p className="text-xs text-gray-500 italic">
          コメントするにはログインが必要です
        </p>
      )}
    </div>
  )
}
