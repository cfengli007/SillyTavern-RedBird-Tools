/**
 * 首页卡片详情栏：点画廊里的卡片后，在右侧第三栏显示这张卡的内容。
 * 风格沿用工具箱的 rbt-* 变量，不引入角色卡管理器的 DOM / 样式，保持界面统一。
 * 这里只负责看；真正开卡要点底部「开始聊天」。
 */
import { useEffect, useState } from 'preact/hooks';
import { ctx } from '../st/st';
import { loadCardDetail, type CardDetailData } from './cardDetailData';
import { openCharacter, type CharItem } from './characters';

interface Props {
  it: CharItem;
  onClose: () => void;
}

function Section({ title, text }: { title: string; text: string }) {
  if (!text || !text.trim()) return null;
  return (
    <section class="rbt-cd-section">
      <h3>{title}</h3>
      <div class="rbt-cd-text">{text}</div>
    </section>
  );
}

function Chips({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section class="rbt-cd-section">
      <h3>{title}</h3>
      <div class="rbt-cd-chips">{items.map((s, i) => <span class="rbt-cd-chip" key={i}>{s}</span>)}</div>
    </section>
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

  return (
    <aside class="rbt-carddetail" aria-label="角色详情">
      <div class="rbt-cd-head">
        <button type="button" class="rbt-icon-btn" title="关闭详情" aria-label="关闭详情" onClick={onClose}><i class="fa-solid fa-xmark" /></button>
        <strong>角色详情</strong>
      </div>
      <div class="rbt-cd-body">
        <div class="rbt-cd-hero">
          <img class="rbt-cd-avatar" src={big} alt="" />
          <div class="rbt-cd-id">
            <h2>{data?.name || it.name}</h2>
            {(data?.creator || data?.version) && <small>{[data.creator, data.version && `v${data.version}`].filter(Boolean).join(' · ')}</small>}
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
          <Chips title="标签" items={[...new Set([...data.tags, ...data.aiTags])]} />
          <Section title="介绍 / 描述" text={data.description} />
          <Section title="人设" text={data.personality} />
          <Section title="场景" text={data.scenario} />
          <Section title="开场白" text={data.firstMes} />
          {data.alternateGreetings.map((g, i) => <Section key={i} title={`备选开场白 ${i + 1}`} text={g} />)}
          <Section title="作者备注" text={data.creatorNotes} />
          {data.worldName && <Chips title="世界书" items={[data.worldName]} />}
        </>}
      </div>
      <div class="rbt-cd-foot">
        <button type="button" class="rbt-btn rbt-btn-primary rbt-cd-start" onClick={start}><i class="fa-solid fa-comments" /> 开始聊天</button>
      </div>
    </aside>
  );
}

