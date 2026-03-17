import { useRef, useEffect, useState } from "react";

interface ContextMenuItem {
  label: string;
  action: () => void;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjusted, setAdjusted] = useState(position);

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let { x, y } = position;
    if (x + rect.width > vw) x = vw - rect.width - 8;
    if (y + rect.height > vh) y = vh - rect.height - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    setAdjusted({ x, y });
  }, [position]);

  return (
    <>
      <div className="context-menu-overlay" onClick={onClose} />
      <div
        ref={menuRef}
        className="context-menu"
        style={{ top: adjusted.y, left: adjusted.x }}
      >
        {items.map((item) => (
          <button
            key={item.label}
            className="context-menu-item"
            onClick={() => {
              item.action();
              onClose();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
