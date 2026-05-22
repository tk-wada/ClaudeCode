import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { generateAIComment } from '@/lib/ai-commentary'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const body = await request.json()
  const { isVisible, aiComment } = body

  const update: Record<string, unknown> = {}
  if (typeof isVisible === 'boolean') update.isVisible = isVisible
  if (typeof aiComment === 'string') update.aiComment = aiComment

  const newsItem = await prisma.newsItem.update({
    where: { id: params.id },
    data: update,
  })

  return NextResponse.json(newsItem)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  await prisma.newsItem.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const newsItem = await prisma.newsItem.findUnique({ where: { id: params.id } })
  if (!newsItem) {
    return NextResponse.json({ error: 'ニュースが見つかりません' }, { status: 404 })
  }

  const comment = await generateAIComment(newsItem.title, newsItem.summary, newsItem.category)
  if (!comment) {
    return NextResponse.json({ error: 'AI コメントの生成に失敗しました' }, { status: 500 })
  }

  const updated = await prisma.newsItem.update({
    where: { id: params.id },
    data: { aiComment: comment },
  })

  return NextResponse.json(updated)
}
