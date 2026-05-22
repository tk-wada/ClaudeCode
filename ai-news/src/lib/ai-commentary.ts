import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function generateAIComment(
  title: string,
  summary: string,
  category: string
): Promise<string> {
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `あなたはLaboro.AIのアナリストです。Laboro.AIは日本のAIコンサルティング企業で、企業向けのカスタムAI開発・導入支援を専門としています。

以下のニュースについて、Laboro.AIにとっての意味・ビジネスへの影響を2〜3文で簡潔にコメントしてください。ビジネス上の機会・脅威・推奨アクションを含め、実務的で具体的な内容にしてください。

カテゴリ: ${category}
タイトル: ${title}
概要: ${summary}

コメント（日本語、2〜3文）:`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type === 'text') {
      return content.text.trim()
    }
    return ''
  } catch (error) {
    console.error('AI commentary generation failed:', error)
    return ''
  }
}
