'use client'

import { useRouter, usePathname } from 'next/navigation'
import { CATEGORIES, Category } from '@/types'

interface CategoryTabsProps {
  activeCategory: string
  onCategoryChange: (cat: string) => void
  categoryCounts?: Record<string, number>
}

const categoryColorMap: Record<Category, string> = {
  [Category.GENERAL]: 'bg-blue-600 text-white',
  [Category.TECH]: 'bg-purple-600 text-white',
  [Category.OVERSEAS]: 'bg-orange-500 text-white',
  [Category.DOMESTIC]: 'bg-green-600 text-white',
  [Category.MANUFACTURING]: 'bg-yellow-500 text-white',
  [Category.CONSUMER]: 'bg-pink-500 text-white',
  [Category.OTHER_INDUSTRY]: 'bg-gray-500 text-white',
  [Category.COMPETITOR]: 'bg-red-600 text-white',
}

const categoryInactiveColorMap: Record<Category, string> = {
  [Category.GENERAL]: 'text-blue-700 hover:bg-blue-50 border-blue-200',
  [Category.TECH]: 'text-purple-700 hover:bg-purple-50 border-purple-200',
  [Category.OVERSEAS]: 'text-orange-700 hover:bg-orange-50 border-orange-200',
  [Category.DOMESTIC]: 'text-green-700 hover:bg-green-50 border-green-200',
  [Category.MANUFACTURING]: 'text-yellow-700 hover:bg-yellow-50 border-yellow-200',
  [Category.CONSUMER]: 'text-pink-700 hover:bg-pink-50 border-pink-200',
  [Category.OTHER_INDUSTRY]: 'text-gray-700 hover:bg-gray-100 border-gray-200',
  [Category.COMPETITOR]: 'text-red-700 hover:bg-red-50 border-red-200',
}

export default function CategoryTabs({ activeCategory, onCategoryChange, categoryCounts }: CategoryTabsProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleCategoryChange = (catId: string) => {
    onCategoryChange(catId)
    const params = new URLSearchParams()
    params.set('category', catId)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="bg-white border-b border-gray-200 sticky top-16 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="flex gap-1 overflow-x-auto py-3 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`
                  flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium
                  border transition-all duration-150 whitespace-nowrap
                  ${isActive
                    ? categoryColorMap[cat.id]
                    : `bg-white ${categoryInactiveColorMap[cat.id]}`
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {cat.label}
                {categoryCounts && categoryCounts[cat.id] !== undefined && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>
                    {categoryCounts[cat.id]}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
