export enum Category {
  GENERAL = 'GENERAL',
  TECH = 'TECH',
  OVERSEAS = 'OVERSEAS',
  DOMESTIC = 'DOMESTIC',
  MANUFACTURING = 'MANUFACTURING',
  CONSUMER = 'CONSUMER',
  OTHER_INDUSTRY = 'OTHER_INDUSTRY',
  COMPETITOR = 'COMPETITOR',
}

export type User = {
  id: string
  name: string | null
  email: string | null
  emailVerified: Date | null
  image: string | null
  role: string
  createdAt: Date
  updatedAt: Date
}

export type Comment = {
  id: string
  content: string
  newsItemId: string
  userId: string
  createdAt: Date
  updatedAt: Date
  user?: User
}

export type NewsItem = {
  id: string
  title: string
  summary: string
  url: string
  source: string
  category: Category
  publishedAt: Date
  aiComment: string | null
  isManual: boolean
  isVisible: boolean
  imageUrl: string | null
  createdAt: Date
  updatedAt: Date
  comments?: Comment[]
}

export type CategoryInfo = {
  id: Category
  label: string
  description: string
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: Category.GENERAL,
    label: '総合',
    description: 'AI業界全般のトップニュース',
  },
  {
    id: Category.TECH,
    label: '技術',
    description: 'LLM・アルゴリズム・研究論文など技術系ニュース',
  },
  {
    id: Category.OVERSEAS,
    label: '海外',
    description: '海外AI企業・動向に関するニュース',
  },
  {
    id: Category.DOMESTIC,
    label: '国内',
    description: '国内AI企業・政策・動向に関するニュース',
  },
  {
    id: Category.MANUFACTURING,
    label: '製造業',
    description: '製造業・工場・生産現場へのAI活用ニュース',
  },
  {
    id: Category.CONSUMER,
    label: '消費財・小売',
    description: '小売・流通・EC・消費者向けAI活用ニュース',
  },
  {
    id: Category.OTHER_INDUSTRY,
    label: 'その他業界',
    description: '各種業界へのAI導入・活用ニュース',
  },
  {
    id: Category.COMPETITOR,
    label: '競合',
    description: 'AI導入支援・コンサル競合他社のニュース',
  },
]
