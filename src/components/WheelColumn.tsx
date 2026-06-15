import { useEffect, useRef } from 'react';

const ITEM = 38;
const VISIBLE = 5;
const PAD = ITEM * 2;
const MASK = 'linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent)';

interface Props {
  values: number[];
  value: number;
  fmt: (v: number) => string;
  suffix?: string;
  onChange: (v: number) => void;
}

/** iOS-style scroll wheel: snaps to the centered item and emits onChange. */
export function WheelColumn({ values, value, fmt, suffix, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idx = Math.max(0, values.indexOf(value));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = idx * ITEM;
    if (Math.abs(el.scrollTop - target) > 1) el.scrollTop = target;
  }, [value, idx]);

  const onScroll = () => {
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      let i = Math.round(el.scrollTop / ITEM);
      i = Math.max(0, Math.min(values.length - 1, i));
      const snap = i * ITEM;
      if (Math.abs(el.scrollTop - snap) > 0.5) el.scrollTo({ top: snap, behavior: 'smooth' });
      if (values[i] !== value) onChange(values[i]);
    }, 110);
  };

  return (
    <div style={{ position: 'relative', flex: '1 1 0', height: ITEM * VISIBLE }}>
      <div
        ref={ref}
        onScroll={onScroll}
        className="wheel-scroll"
        style={{
          position: 'absolute',
          inset: 0,
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          maskImage: MASK,
          WebkitMaskImage: MASK,
        }}
      >
        <div style={{ height: PAD }} />
        {values.map((v, i) => (
          <div
            key={v}
            onClick={() => {
              const el = ref.current;
              if (el) el.scrollTo({ top: i * ITEM, behavior: 'smooth' });
              if (v !== value) onChange(v);
            }}
            style={{
              height: ITEM,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              scrollSnapAlign: 'center',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                fontSize: i === idx ? 22 : 18,
                fontWeight: 700,
                lineHeight: 1,
                color: i === idx ? '#0E1721' : '#BFC8CE',
                fontVariantNumeric: 'tabular-nums',
                transition: 'color .12s, font-size .12s',
              }}
            >
              {fmt(v)}
            </span>
            {suffix ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '.04em',
                  color: i === idx ? '#878C91' : '#CFD6DB',
                }}
              >
                {suffix}
              </span>
            ) : null}
          </div>
        ))}
        <div style={{ height: PAD }} />
      </div>
    </div>
  );
}
