/**
 * 首页卡片详情的数据：只读当前这张卡，不碰其它卡。
 * 角色卡管理器的 AI 总结写在卡的 extensions.ai_summary / ai_tags，插件直接读，
 * 不调用脚本、不额外触发 AI。卡片在酒馆里是浅加载（shallow）时按需展开一次。
 */
import { type Any } from '../st/st';
import { findChar, ensureFullCharacter } from '../tools/cards/cards';

export interface CardDetailData {
  avatar: string;
  name: string;
  description: string;
  personality: string;
  scenario: string;
  firstMes: string;
  alternateGreetings: string[];
  creatorNotes: string;
  creator: string;
  version: string;
  tags: string[];
  /** 酒馆助手脚本 / 角色卡管理器写进卡里的 AI 摘要与标签。 */
  aiSummary: string;
  aiTags: string[];
  /** 卡自带世界书的名字（如果有）。 */
  worldName: string;
  shallow: boolean;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function list(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(str).filter(Boolean);
  return [];
}

/** 从酒馆内存里的卡整理出详情。 */
function readFrom(ch: Any, avatar: string): CardDetailData {
  const d = ch?.data ?? ch ?? {};
  const ext = d.extensions ?? ch?.extensions ?? {};
  return {
    avatar,
    name: str(ch?.name ?? d.name),
    description: str(d.description),
    personality: str(d.personality),
    scenario: str(d.scenario),
    firstMes: str(d.first_mes),
    alternateGreetings: list(d.alternate_greetings),
    creatorNotes: str(d.creator_notes ?? ch?.creatorcomment),
    creator: str(d.creator ?? ch?.creator),
    version: str(d.character_version),
    tags: list(d.tags),
    aiSummary: str(ext.ai_summary),
    aiTags: list(ext.ai_tags),
    worldName: str(ext.world ?? ch?.world ?? ''),
    shallow: !!ch?.shallow,
  };
}

/** 取详情：浅卡先展开一次，之后直接读内存。 */
export async function loadCardDetail(avatar: string): Promise<CardDetailData | null> {
  const found = findChar(avatar);
  if (!found) return null;
  if (found.char.shallow) await ensureFullCharacter(avatar);
  const after = findChar(avatar);
  return readFrom(after?.char ?? found.char, avatar);
}

export function cardDetailSync(avatar: string): CardDetailData | null {
  const found = findChar(avatar);
  return found ? readFrom(found.char, avatar) : null;
}