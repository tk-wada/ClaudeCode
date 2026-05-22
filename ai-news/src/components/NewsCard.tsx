import { NewsItem, Category } from '@/types'
import CommentSection from './CommentSection'

interface CurrentUser {
  id: string
  name: string | null
  image: string | null
}

interface NewsCardProps {
  news: NewsItem
  currentUser: CurrentUser | null
}

const categoryBadgeMap: Record<Category, string> = {
  [Category.GENERAL]: 'bg-blue-100 text-blue-800',
  [Category.TECH]: 'bg-purple-100 text-purple-800',
  [Category.OVERSEAS]: 'bg-orange-100 text-orange-800',
  [Category.DOMESTIC]: 'bg-green-100 text-green-800',
  [Category.MANUFACTURING]: 'bg-yellow-100 text-yellow-800',
  [Category.CONSUMER]: 'bg-pink-100 text-pink-800',
  [Category.OTHER_INDUSTRY]: 'bg-gray-100 text-gray-700',
  [Category.COMPETITOR]: 'bg-red-100 text-red-800',
}

const categoryLabelMap: Record<Category, string> = {
  [Category.GENERAL]: '総合',
  [Category.TECH]: '技術',
  [Category.OVERSEAS]: '海外',
  [Category.DOMESTIC]: '国内',
  [Category.MANUFACTURING]: '製造業',
  [Category.CONSUMER]: '消費財・小売',
  [Category.OTHER_INDUSTRY]: 'その他業界',
  [Category.COMPETITOR]: '競合',
}

function formatDateJP(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function NewsCard({ news, currentUser }: NewsCardProps) {
  const badgeClass = categoryBadgeMap[news.category as Category] ?? 'bg-gray-100 text-gray-700'
  const categoryLabel = categoryLabelMap[news.category as Category] ?? news.category

  return (
    <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
      {/* Header: badge + date */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${badgeClass}`}
        >
          {categoryLabel}
        </span>
        <time className="text-xs text-gray-400" dateTime={new Date(news.publishedAt).toISOString()}>
          {formatDateJP(news.publishedAt)}
        </time>
      </div>

      {/* Image (optional) */}
      {news.imageUrl && (
        <div className="mb-3 -mx-5 -mt-1">
          <img
            src={news.imageUrl}
            alt={news.title}
            className="w-full h-40 object-cover"
          />
        </div>
      )}

      {/* Title */}
      <h2 className="text-base font-bold text-gray-900 leading-snug mb-2">
        <a
          href={news.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-700 transition-colors"
        >
          {news.title}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="inline-block w-3.5 h-3.5 ml-1 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </h2>

      {/* Source */}
      <p className="text-xs text-gray-500 mb-3 font-medium">{news.source}</p>

      {/* Summary */}
      <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 mb-4">
        {news.summary}
      </p>

      {/* AI Comment */}
      {news.aiComment && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-base" role="img" aria-label="robot">
              🤖
            </span>
            <span className="text-xs font-semibold text-blue-700">
              Laboro.AI 視点
            </span>
          </div>
          <p className="text-sm text-blue-900 leading-relaxed">{news.aiComment}</p>
        </div>
      )}

      {/* Comments */}
      <CommentSection
        newsItemId={news.id}
        comments={news.comments ?? []}
        currentUser={currentUser}
      />
    </article>
  )
}
