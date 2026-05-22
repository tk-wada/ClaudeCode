import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generateAIComment } from '@/lib/ai-commentary'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const newsItem = await prisma.newsItem.findUnique({
      where: { id: params.id },
    })
    if (!newsItem) {
      return NextResponse.json({ error: 'ニュースが見つかりません' }, { status: 404 })
    }

    const comment = await generateAIComment(
      newsItem.title,
      newsItem.summary,
      newsItem.category
    )

    if (!comment) {
      return NextResponse.json(
        { error: 'AI コメントの生成に失敗しました' },
        { status: 500 }
      )
    }

    const updated = await prisma.newsItem.update({
      where: { id: params.id },
      data: { aiComment: comment },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('POST /api/news/[id]/generate-comment error:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
