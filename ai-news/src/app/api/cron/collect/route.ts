import { NextRequest, NextResponse } from 'next/server'
import { collectAndSaveNews } from '@/lib/news-collector'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`

  if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
    return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 })
  }

  try {
    await collectAndSaveNews()
    return NextResponse.json({
      success: true,
      message: 'ニュースの収集が完了しました',
    })
  } catch (error) {
    console.error('News collection error:', error)
    return NextResponse.json(
      { error: 'ニュース収集中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
