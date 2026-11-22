/**
 * 首页卡片画廊的虚拟网格。
 * 借鉴「角色卡管理器」的思路：列表看起来有 100 张卡，DOM 里同时只保留可见的十几张，
 * 上下用占位撑出滚动高度；图片用原生缩略图懒加载，不做批量原图解码。
 * 列数按容器宽度自适应，不写死 3 列。
 */
import { useEffect, useRef, useState } from 'preact/hooks';

/** 卡片的目标宽度：尽量让每张卡接近这个尺寸，列数随容器宽度变化。 */
const TARGET_CARD_W = 190;
/** 卡片宽高比（和 CSS 的 aspect-ratio: 2/3 一致），用来估算行高。 */
const CARD_RATIO = 1.5;
/** 视口上下各多渲染几行，滚动时不露白。 */
const OVERSCAN_ROWS = 2;

export interface VirtualGrid {
  /** 绑在滚动容器上。 */
  ref: (el: HTMLElement | null) => void;
  /** 当前列数（给 CSS 用）。 */
  cols: number;
  /** 顶部 / 底部占位高度。 */
  padTop: number;
  padBottom: number;
  /** 这一帧要渲染的 item 下标区间 [start, end)。 */
  start: number;
  end: number;
}

/**
 * @param count 卡片总数
 * @param resetKey 筛选 / 排序变化时重置滚动位置的标识
 */
export function useVirtualGrid(count: number, resetKey: string): VirtualGrid {
  const elRef = useRef<HTMLElement | null>(null);
  const [metrics, setMetrics] = useState({ cols: 1, rowH: 0, start: 0, end: 0, padTop: 0, padBottom: 0 });
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const [width, setWidth] = useState(0);

  // 容器尺寸变化时重算列数和行高；用 ResizeObserver，横竖屏切换自动跟上。
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth || el.getBoundingClientRect().width || 0;
      const h = el.clientHeight || el.getBoundingClientRect().height || 0;
      setWidth(w);
      setViewportH(h);
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  // 筛选 / 排序变了就回到顶部，避免停在一个已经不存在的位置。
  useEffect(() => {
    const el = elRef.current;
    if (el) el.scrollTop = 0;
    setScrollTop(0);
  }, [resetKey]);

  useEffect(() => {
    if (!width || !viewportH) return;
    // gap 和 CSS 的变量保持一致（--rbt-s-4 一般 16px，列间距用 12px 足够）
    const gap = 12;
    const cols = Math.max(1, Math.floor((width + gap) / (TARGET_CARD_W + gap)));
    const cardW = (width - gap * (cols - 1)) / cols;
    const rowH = cardW * CARD_RATIO + gap;
    const rows = Math.ceil(count / cols);
    const first = Math.max(0, Math.floor(scrollTop / rowH) - OVERSCAN_ROWS);
    const visible = Math.ceil(viewportH / rowH) + OVERSCAN_ROWS * 2;
    const last = Math.min(rows, first + visible);
    setMetrics({
      cols, rowH,
      start: first * cols,
      end: Math.min(count, last * cols),
      padTop: first * rowH,
      padBottom: Math.max(0, (rows - last) * rowH),
    });
  }, [width, viewportH, scrollTop, count]);

  const onScroll = (e: Event) => setScrollTop((e.currentTarget as HTMLElement).scrollTop);
  // ref 回调里只在第一次挂上时绑定 scroll（Preact 的 ref 回调每次渲染会重挂，用标志避免重复监听）。
  const bound = useRef<HTMLElement | null>(null);
  const ref = (el: HTMLElement | null) => {
    if (bound.current === el) return;
    if (bound.current) bound.current.removeEventListener('scroll', onScroll);
    bound.current = el;
    elRef.current = el;
    if (el) el.addEventListener('scroll', onScroll, { passive: true });
  };

  return { ref, cols: metrics.cols, padTop: metrics.padTop, padBottom: metrics.padBottom, start: metrics.start, end: metrics.end };
}
