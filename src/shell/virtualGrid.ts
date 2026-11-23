/**
 * 首页卡片画廊的虚拟网格（绝对定位版）。
 * 借鉴角色卡管理器: 列表看起来有 100 张卡, DOM 里只放可见的十几张,
 * 用绝对坐标精确摆放, 上下 spacer 撑出总高度. 卡片宽高由 JS 算死, 杜绝重叠.
 * 列数按容器宽度自适应, 横竖屏自动重排.
 */
import { useEffect, useRef, useState } from 'preact/hooks';

const TARGET_CARD_W = 150;
const CARD_RATIO = 2 / 3;
const GAP = 12;
const OVERSCAN_ROWS = 2;

export interface Cell {
  index: number;
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface VirtualGrid {
  ref: (el: HTMLElement | null) => void;
  cells: Cell[];
  totalH: number;
}

export function useVirtualGrid(count: number, resetKey: string): VirtualGrid {
  const elRef = useRef<HTMLElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0, scrollTop: 0 });

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const measure = () => setBox((b) => ({ ...b, w: el.clientWidth, h: el.clientHeight }));
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  useEffect(() => {
    const el = elRef.current;
    if (el) el.scrollTop = 0;
    setBox((b) => ({ ...b, scrollTop: 0 }));
  }, [resetKey]);

  const onScroll = (e: Event) => {
    const top = (e.currentTarget as HTMLElement).scrollTop;
    setBox((b) => (b.scrollTop === top ? b : { ...b, scrollTop: top }));
  };
  const bound = useRef<HTMLElement | null>(null);
  const ref = (el: HTMLElement | null) => {
    if (bound.current === el) return;
    if (bound.current) bound.current.removeEventListener('scroll', onScroll);
    bound.current = el;
    elRef.current = el;
    if (el) el.addEventListener('scroll', onScroll, { passive: true });
  };

  const { w, h, scrollTop } = box;
  if (!w || !h || !count) return { ref, cells: [], totalH: 0 };

  const cols = Math.max(1, Math.floor((w + GAP) / (TARGET_CARD_W + GAP)));
  const cardW = (w - GAP * (cols - 1)) / cols;
  const cardH = cardW / CARD_RATIO;
  const rowH = cardH + GAP;
  const rows = Math.ceil(count / cols);
  const totalH = rows * rowH - GAP;
  const firstRow = Math.max(0, Math.floor(scrollTop / rowH) - OVERSCAN_ROWS);
  const lastRow = Math.min(rows, Math.ceil((scrollTop + h) / rowH) + OVERSCAN_ROWS);
  const cells: Cell[] = [];
  for (let r = firstRow; r < lastRow; r++) {
    for (let c = 0; c < cols; c++) {
      const index = r * cols + c;
      if (index >= count) break;
      cells.push({ index, top: r * rowH, left: c * (cardW + GAP), width: cardW, height: cardH });
    }
  }
  return { ref, cells, totalH };
}
