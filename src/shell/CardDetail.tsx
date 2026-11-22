/**
 * 首页卡片详情：点画廊里的卡片后显示这张卡的内容。
 * 电脑（宽屏）：右侧第三栏；手机/竖屏：遮罩弹窗，点遮罩外或 X 关闭。
 * 风格沿用工具箱的 rbt-* 变量，保持界面统一。
 * 这里只负责看和选开场白；真正进卡由底部按钮或开场白按钮决定。
 */
import { useEffect, useState } from 'preact/hooks';
import { ctx, toast, type Any } from '../st/st';
import { loadCardDetail, type CardDetailData } from './cardDetailData';
import { openCharacter, type CharItem } from './characters';
import { compact } from './Shell';
import { openWorldInST } from '../ui/pages/parts';

interface Props {
  it: CharItem;
  onClose: () => void;
}

function Section({ title, text, action }: { title: string; text: string; action?: Any }) {
  if (!text || !text.trim()) return null;
  return (
    <section class="rbt-cd-section">
      <div class="rbt-cd-sec-head"><h3>{title}</h3>{action}</div>
      <div class="rbt-cd-text">{text}</div>
    </section>
  );
}

/** 彩色标签：酒馆原生标签用 it.tags 里的 color，AI 标签没有颜色用默认色。 */
function Tags({ it, data }: { it: CharItem; data: CardDetailData }) {
  const native = it.tags ?? [];
  const nativeNames = new Set(native.map((t) => t.name));
  const ai = data.aiTags.filter((n) => !nativeNames.has(n));
  const all: { name: string; color?: string }[] = [
    ...native.map((t) => ({ name: t.name, color: t.color })),
    ...ai.map((name) => ({ name, color: undefined })),
  ];
  if (!all.length) return null;
  return (
    <section class="rbt-cd-section">
      <h3>标签</h3>
      <div class="rbt-cd-chips">
        {all.map((t, i) => (
          <span class="rbt-cd-chip" key={i} style={t.color ? { '--chip-c': t.color } as Any : undefined}>{t.name}</span>
        ))}
      </div>
    </section>
  );
}


/** 真正的开局：构造 swipes 列表（主开场白 + 所有备选），设置第 index 条。 */
async function playGreeting(it: CharItem, d: CardDetailData, index: number, onClose: () => void): Promise<void> {
  const swipes = [d.firstMes, ...d.alternateGreetings].filter((s) => s !== undefined);
  await openCharacter(it);
  onClose();
  const c = ctx();
  const TH = (window as unknown as { TavernHelper?: Any }).TavernHelper;
  const setMessages = TH?.setChatMessages ?? c.setChatMessages;
  if (typeof setMessages !== 'function' || !swipes.length) {
    toast('info', '已开卡，但没找到酒馆助手的设置开场白接口，请手动切换开场白。');
    return;
  }
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    if (String(c.characterId) === it.ref && document.querySelector('#chat .mes')) break;
    await new Promise((r) => setTimeout(r, 120));
  }
  try {
    await setMessages([{ message_id: 0, swipes, swipe_id: index }]);
    c.eventSource?.emit?.(c.eventTypes?.MORE_MESSAGES_LOADED);
  } catch (e) { console.warn('[RedBird] 设置开场白失败', e); }
}

function Greeting({ it, d, index, text, onClose }: { it: CharItem; d: CardDetailData; index: number; text: string; onClose: () => void }) {
  const label = index === 0 ? '开场白' : `备选开场白 ${index}`;
  return (
    <details class="rbt-cd-greeting">
      <summary class="rbt-cd-greeting-sum">
        <i class="fa-solid fa-chevron-right rbt-cd-greeting-chev" />
        <span class={index === 0 ? 'rbt-cd-gtag main' : 'rbt-cd-gtag alt'}>{label}</span>
        <button type="button" class="rbt-cd-play" title={`用${label}开始聊天`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); void playGreeting(it, d, index, onClose); }}><i class="fa-solid fa-play" /> 开始</button>
      </summary>
      <div class="rbt-cd-text rbt-cd-greeting-text">{text}</div>
    </details>
  );
}

export function CardDetail({ it, onClose }: Props) {
  const [data, setData] = useState<CardDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setData(null);
    void loadCardDetail(it.key.slice(2)).then((d) => {
      if (alive) { setData(d); setLoading(false); }
    });
    return () => { alive = false; };
  }, [it.key]);

  const avatar = it.key.slice(2);
  const big = ctx().getThumbnailUrl ? ctx().getThumbnailUrl('avatar', avatar) : it.thumb;
  const start = () => { onClose(); void openCharacter(it); };
  const openWorld = () => { const name = data?.worldName; if (name) { onClose(); openWorldInST(name); } };
  const phone = compact.value;

  const body = (
    <>
      <div class="rbt-cd-head">
        <button type="button" class="rbt-icon-btn" title="关闭详情" aria-label="关闭详情" onClick={onClose}><i class="fa-solid fa-xmark" /></button>
        <strong>角色详情</strong>
      </div>
      <div class="rbt-cd-body">
        <div class="rbt-cd-hero">
          <img class="rbt-cd-avatar" src={big} alt="" />
          <div class="rbt-cd-id">
            <h2>{data?.name || it.name}</h2>
            <div class="rbt-cd-herometa">
              {(data?.creator || data?.version) && <small>{[data.creator, data.version && 'v' + data.version].filter(Boolean).join(' · ')}</small>}
              {data?.worldName && <button type="button" class="rbt-cd-wb" title="打开世界书" onClick={openWorld}><i class="fa-solid fa-book-atlas" /> {data.worldName}</button>}
            </div>
          </div>
        </div>
        {loading && <div class="rbt-cd-loading">读取角色卡…</div>}
        {!loading && !data && <div class="rbt-cd-loading">这张卡的数据暂时读不到。</div>}
        {data && <>
          {data.aiSummary && (
            <section class="rbt-cd-section rbt-cd-ai">
              <h3><i class="fa-solid fa-wand-magic-sparkles" /> AI 总结</h3>
              <div class="rbt-cd-text">{data.aiSummary}</div>
            </section>
          )}
          <Tags it={it} data={data} />
          <Section title="介绍 / 描述" text={data.description} />
          <Section title="人设" text={data.personality} />
          <Section title="场景" text={data.scenario} />
          <Greeting it={it} d={data} index={0} text={data.firstMes} onClose={onClose} />
          {data.alternateGreetings.map((g, i) => <Greeting key={i + 1} it={it} d={data} index={i + 1} text={g} onClose={onClose} />)}
          <Section title="作者备注" text={data.creatorNotes} />
        </>}
      </div>
      <div class="rbt-cd-foot">
        <button type="button" class="rbt-btn rbt-btn-primary rbt-cd-start" onClick={start}><i class="fa-solid fa-comments" /> 开始聊天</button>
      </div>
    </>
  );

  if (phone) {
    return (
      <div class="rbt-cd-modal-wrap">
        <div class="rbt-cd-backdrop" onClick={onClose} />
        <aside class="rbt-carddetail rbt-cd-modal" aria-label="角色详情">{body}</aside>
      </div>
    );
  }
  return <aside class="rbt-carddetail" aria-label="角色详情">{body}</aside>;
}
