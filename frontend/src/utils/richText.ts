/**
 * 轻格式正文解析（板块简介 / article 正文 / 公司长文共用）。
 * 约定（后台 textarea 纯文本即可）：
 * - 空行 = 分段（全部正文统一字号，不做首段引言）；
 * - 行首「- 」= 列表条目（连续行合并为一组）；
 * - 单行「标签｜内容」= 要点行（半角/全角竖线均可，标签 ≤12 字）。
 */

export interface RichParagraph {
  type: 'p'
  lines: string[]
}

export interface RichList {
  type: 'list'
  items: string[]
}

export interface RichKeyValue {
  type: 'kv'
  key: string
  value: string
}

export type RichBlock = RichParagraph | RichList | RichKeyValue

/** 「标签｜内容」要点行（标签 ≤12 字，避免把含竖线的长句误判为要点）。 */
const KV_RE = /^([^｜|\n]{1,12})[｜|](.+)$/
const LIST_ITEM_RE = /^[-•]\s*/

export function parseRichText(text: string): RichBlock[] {
  const blocks = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)

  return blocks.flatMap((block): RichBlock[] => {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length > 0 && lines.every((line) => LIST_ITEM_RE.test(line))) {
      return [{ type: 'list', items: lines.map((line) => line.replace(LIST_ITEM_RE, '')) }]
    }
    // 「标签｜内容」：块内每一行都是要点行时逐行展开（常见写法是多行连排）
    if (lines.length > 0 && lines.every((line) => KV_RE.test(line))) {
      return lines.map((line) => {
        const match = line.match(KV_RE)
        return { type: 'kv', key: match![1].trim(), value: match![2].trim() }
      })
    }
    return [{ type: 'p', lines }]
  })
}
