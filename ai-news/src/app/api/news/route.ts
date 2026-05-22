import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { Category } from '@/types'
import { generateAIComment } from '@/lib/ai-commentary'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') as Category | null
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const includeHidden = searchParams.get('includeHidden') === 'true'

  const session = await auth()
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (category) where.category = category
  if (!includeHidden || !session) where.isVisible = true

  const [items, total] = await Promise.all([
    prisma.newsItem.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip,
      take: limit,
      include: {
        comments: {
          include: { user: { select: { id: true, name: true, image: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { comments: true } },
      },
    }),
    prisma.newsItem.count({ where }),
  ])

  return NextResponse.json({ items, total, page, limit })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const body = await request.json()
  const { title, url, summary, category, publishedAt, imageUrl } = body

  if (!title || !url || !summary || !category) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  const existing = await prisma.newsItem.findUnique({ where: { url } })
  if (existing) {
    return NextResponse.json({ error: '同じURLのニュースが既に存在します' }, { status: 409 })
  }

  const newsItem = await prisma.newsItem.create({
    data: {
      title,
      url,
      summary,
      category,
      source: 'manual',
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      imageUrl: imageUrl || null,
      isManual: true,
    },
  })

  generateAIComment(title, summary, category).then(async (comment) => {
    if (comment) {
      await prisma.newsItem.update({
        where: { id: newsItem.id },
        data: { aiComment: comment },
      })
    }
  })

  return NextResponse.json(newsItem, { status: 201 })
}
