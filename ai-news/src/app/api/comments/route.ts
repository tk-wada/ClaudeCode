import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const newsItemId = searchParams.get('newsItemId')

  if (!newsItemId) {
    return NextResponse.json({ error: 'newsItemId が必要です' }, { status: 400 })
  }

  const comments = await prisma.comment.findMany({
    where: { newsItemId },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(comments)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const body = await request.json()
  const { newsItemId, content } = body

  if (!newsItemId || !content?.trim()) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  if (content.length > 500) {
    return NextResponse.json({ error: 'コメントは500文字以内にしてください' }, { status: 400 })
  }

  const newsExists = await prisma.newsItem.findUnique({ where: { id: newsItemId } })
  if (!newsExists) {
    return NextResponse.json({ error: 'ニュースが見つかりません' }, { status: 404 })
  }

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      newsItemId,
      userId: session.user.id,
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  })

  return NextResponse.json(comment, { status: 201 })
}
