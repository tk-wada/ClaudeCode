import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { Category, CATEGORIES } from '@/types'
import NewsCard from '@/components/NewsCard'
import CategoryTabsWrapper from '@/components/CategoryTabsWrapper'

interface PageProps {
  searchParams: { category?: string }
}

function isValidCategory(cat: string): cat is Category {
  return Object.values(Category).includes(cat as Category)
}

async function getNews(category: Category) {
  const newsItems = await prisma.newsItem.findMany({
    where: {
      category,
      isVisible: true,
    },
    orderBy: { publishedAt: 'desc' },
    take: 20,
    include: {
      comments: {
        include: {
          user: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  return newsItems
}

async function getCategoryCounts() {
  const counts = await prisma.newsItem.groupBy({
    by: ['category'],
    where: { isVisible: true },
    _count: { _all: true },
  })
  return Object.fromEntries(counts.map((c) => [c.category, c._count._all]))
}

function NewsCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-5 w-16 bg-gray-200 rounded-full" />
        <div className="h-4 w-24 bg-gray-200 rounded" />
      </div>
      <div className="h-5 w-full bg-gray-200 rounded mb-2" />
      <div className="h-5 w-3/4 bg-gray-200 rounded mb-3" />
      <div className="h-4 w-20 bg-gray-200 rounded mb-3" />
      <div className="space-y-2">
        <div className="h-3 w-full bg-gray-200 rounded" />
        <div className="h-3 w-full bg-gray-200 rounded" />
        <div className="h-3 w-2/3 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

export default async function HomePage({ searchParams }: PageProps) {
  const rawCategory = searchParams.category ?? ''
  const activeCategory: Category = isValidCategory(rawCategory)
    ? rawCategory
    : Category.GENERAL

  const session = await auth()
  const currentUser = session?.user
    ? {
        id: session.user.id,
        name: session.user.name ?? null,
        image: session.user.image ?? null,
      }
    : null

  const [newsItems, categoryCounts] = await Promise.all([
    getNews(activeCategory),
    getCategoryCounts(),
  ])

  const activeCategoryInfo = CATEGORIES.find((c) => c.id === activeCategory)

  return (
    <div>
      {/* Category tabs */}
      <CategoryTabsWrapper
        activeCategory={activeCategory}
        categoryCounts={categoryCounts}
      />

      {/* Content area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">
            {activeCategoryInfo?.label ?? activeCategory}
          </h1>
          {activeCategoryInfo?.description && (
            <p className="text-sm text-gray-500 mt-1">{activeCategoryInfo.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {newsItems.length}件のニュース
          </p>
        </div>

        {newsItems.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg mb-2">このカテゴリのニュースはまだありません</p>
            <p className="text-sm">後ほど再度ご確認ください</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {newsItems.map((item) => (
              <NewsCard
                key={item.id}
                news={{
                  ...item,
                  category: item.category as Category,
                  publishedAt: item.publishedAt,
                  createdAt: item.createdAt,
                  updatedAt: item.updatedAt,
                  comments: item.comments.map((c) => ({
                    ...c,
                    createdAt: c.createdAt,
                    updatedAt: c.updatedAt,
                    user: c.user
                      ? {
                          ...c.user,
                          emailVerified: c.user.emailVerified,
                          createdAt: c.user.createdAt,
                          updatedAt: c.user.updatedAt,
                        }
                      : undefined,
                  })),
                }}
                currentUser={currentUser}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
