import Parser from 'rss-parser'
import { prisma } from './prisma'
import { generateAIComment } from './ai-commentary'
import { Category } from '@/types'

const rssParser = new Parser()

const RSS_FEEDS = [
  { url: 'https://jp.techcrunch.com/feed/', source: 'TechCrunch Japan' },
  { url: 'https://rss.itmedia.co.jp/rss/2.0/ait.xml', source: 'ITmedia AI+' },
  { url: 'https://ainow.ai/feed/', source: 'AINOW' },
]

function categorize(title: string, content: string): Category {
  const text = `${title} ${content}`.toLowerCase()

  const techKeywords = ['llm', 'モデル', 'アルゴリズム', '論文', '研究', 'transformer', 'ファインチューニング', '機械学習', 'ディープラーニング', 'neural', 'gpt', 'bert']
  const overseasKeywords = ['openai', 'google', 'microsoft', 'nvidia', 'meta', 'amazon', 'apple', '海外', 'アメリカ', '米国', '中国', '欧州', 'anthropic', 'deepmind']
  const domesticKeywords = ['日本', '国内', '国産', '政府', '経済産業省', '総務省', '文部科学省', 'ntt', 'fujitsu', '富士通', 'ソフトバンク', 'nec', 'hitachi', '日立']
  const manufacturingKeywords = ['製造', '工場', '生産', '品質管理', 'ものづくり', '自動車', 'toyota', 'honda', '設備', '検査', '産業用']
  const consumerKeywords = ['小売', '流通', 'ec', '消費者', '買い物', 'eコマース', '楽天', 'amazon', 'イオン', 'セブン', 'コンビニ', 'マーケティング']
  const competitorKeywords = ['ai導入', 'aiコンサル', 'dx支援', 'ai開発', 'システム開発', 'itコンサル', 'accenture', 'デロイト', '野村総合研究所', 'nri', '富士通コンサルティング']

  if (techKeywords.some(k => text.includes(k))) return Category.TECH
  if (overseasKeywords.some(k => text.includes(k))) return Category.OVERSEAS
  if (competitorKeywords.some(k => text.includes(k))) return Category.COMPETITOR
  if (domesticKeywords.some(k => text.includes(k))) return Category.DOMESTIC
  if (manufacturingKeywords.some(k => text.includes(k))) return Category.MANUFACTURING
  if (consumerKeywords.some(k => text.includes(k))) return Category.CONSUMER

  return Category.OTHER_INDUSTRY
}

async function collectFromNewsAPI(): Promise<
  Array<{ title: string; summary: string; url: string; source: string; publishedAt: Date; imageUrl?: string }>
> {
  const apiKey = process.env.NEWS_API_KEY
  if (!apiKey) return []

  const queries = ['AI', 'LLM', 'artificial intelligence', '人工知能', '生成AI']
  const articles: Array<{ title: string; summary: string; url: string; source: string; publishedAt: Date; imageUrl?: string }> = []
  const seenUrls = new Set<string>()

  for (const q of queries) {
    try {
      const params = new URLSearchParams({
        q,
        language: q === 'AI' || q === 'LLM' || q === 'artificial intelligence' ? 'en' : 'jp',
        sortBy: 'publishedAt',
        pageSize: '20',
        apiKey,
      })
      const res = await fetch(`https://newsapi.org/v2/everything?${params}`)
      if (!res.ok) continue

      const data = await res.json()
      if (data.articles) {
        for (const a of data.articles) {
          if (!a.url || seenUrls.has(a.url) || a.title === '[Removed]') continue
          seenUrls.add(a.url)
          articles.push({
            title: a.title ?? '',
            summary: a.description ?? a.content ?? '',
            url: a.url,
            source: a.source?.name ?? 'NewsAPI',
            publishedAt: new Date(a.publishedAt),
            imageUrl: a.urlToImage ?? undefined,
          })
        }
      }
    } catch (error) {
      console.error(`NewsAPI fetch failed for query "${q}":`, error)
    }
  }

  return articles
}

async function collectFromRSS(): Promise<
  Array<{ title: string; summary: string; url: string; source: string; publishedAt: Date; imageUrl?: string }>
> {
  const articles: Array<{ title: string; summary: string; url: string; source: string; publishedAt: Date; imageUrl?: string }> = []

  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await rssParser.parseURL(feed.url)
      for (const item of parsed.items ?? []) {
        if (!item.link) continue
        articles.push({
          title: item.title ?? '',
          summary: item.contentSnippet ?? item.content ?? item.summary ?? '',
          url: item.link,
          source: feed.source,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          imageUrl: undefined,
        })
      }
    } catch (error) {
      console.error(`RSS fetch failed for ${feed.url}:`, error)
    }
  }

  return articles
}

export async function collectAndSaveNews(): Promise<void> {
  const [newsApiArticles, rssArticles] = await Promise.all([
    collectFromNewsAPI(),
    collectFromRSS(),
  ])

  const allArticles = [...newsApiArticles, ...rssArticles]

  for (const article of allArticles) {
    try {
      const existing = await prisma.newsItem.findUnique({ where: { url: article.url } })
      if (existing) continue

      const category = categorize(article.title, article.summary)
      const aiComment = await generateAIComment(article.title, article.summary, category)

      await prisma.newsItem.create({
        data: {
          title: article.title,
          summary: article.summary,
          url: article.url,
          source: article.source,
          category,
          publishedAt: article.publishedAt,
          aiComment: aiComment || null,
          isManual: false,
          isVisible: true,
          imageUrl: article.imageUrl ?? null,
        },
      })
    } catch (error) {
      console.error(`Failed to save article "${article.title}":`, error)
    }
  }
}
