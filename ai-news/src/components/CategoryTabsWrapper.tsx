'use client'

import { useState } from 'react'
import CategoryTabs from './CategoryTabs'

interface CategoryTabsWrapperProps {
  activeCategory: string
  categoryCounts: Record<string, number>
}

export default function CategoryTabsWrapper({
  activeCategory: initialCategory,
  categoryCounts,
}: CategoryTabsWrapperProps) {
  const [activeCategory, setActiveCategory] = useState(initialCategory)

  return (
    <CategoryTabs
      activeCategory={activeCategory}
      onCategoryChange={setActiveCategory}
      categoryCounts={categoryCounts}
    />
  )
}
