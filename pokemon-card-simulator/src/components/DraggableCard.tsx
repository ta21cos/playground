import { useRef } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Card } from "./Card";
import type { CardInstance } from "../types/game-state";

interface DraggableCardProps {
  instance: CardInstance;
  onClick?: (pos: { x: number; y: number }) => void;
  acceptDrop?: boolean;
  attachedInstances?: CardInstance[];
  stackDirection?: "right" | "up";
}

export function DraggableCard({
  instance,
  onClick,
  acceptDrop,
  attachedInstances,
  stackDirection = "right",
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

  const hasAttachments = attachedInstances && attachedInstances.length > 0;
  const stackClass = hasAttachments
    ? stackDirection === "up"
      ? "card-stack card-stack-up"
      : "card-stack"
    : undefined;

  const mainCard = (
    <Card card={instance.card} damageCounters={instance.damageCounters} />
  );
  const attachedCards = attachedInstances?.map((attached, idx) => (
    <div
      key={attached.instanceId}
      className="attached-card"
      style={{ zIndex: attachedInstances.length - idx }}
    >
      <Card card={attached.card} />
    </div>
  ));

  return (
    <div
      ref={(node) => {
        setDragRef(node);
        setDropRef(node);
      }}
      className={stackClass}
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
      {stackDirection === "up" ? (
        <>
          {attachedCards}
          {mainCard}
        </>
      ) : (
        <>
          {mainCard}
          {attachedCards}
        </>
      )}
    </div>
  );
}
