import { useRef } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Card } from "./Card";
import type { CardInstance } from "../types/game-state";

interface DraggableCardProps {
  instance: CardInstance;
  onClick?: (pos: { x: number; y: number }) => void;
  acceptDrop?: boolean;
}

export function DraggableCard({
  instance,
  onClick,
  acceptDrop,
}: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({ id: instance.instanceId });
  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `card:${instance.instanceId}`,
    disabled: !acceptDrop,
  });
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : undefined,
      }
    : {
        outline: isOver ? "2px solid #3498db" : undefined,
      };

  return (
    <div
      ref={(node) => {
        setDragRef(node);
        setDropRef(node);
      }}
      style={style}
      {...listeners}
      {...attributes}
      data-card-id={instance.instanceId}
      data-card-name={instance.card.name}
      data-card-category={instance.card.card_category}
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
        listeners?.onPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        if (pointerStart.current) {
          const dx = Math.abs(e.clientX - pointerStart.current.x);
          const dy = Math.abs(e.clientY - pointerStart.current.y);
          if (dx < 5 && dy < 5) {
            onClick?.({ x: e.clientX, y: e.clientY });
          }
          pointerStart.current = null;
        }
      }}
    >
      <Card
        card={instance.card}
        damageCounters={instance.damageCounters}
        attachedEnergies={instance.attachedEnergies.length}
        attachedTool={instance.attachedTool}
      />
    </div>
  );
}
