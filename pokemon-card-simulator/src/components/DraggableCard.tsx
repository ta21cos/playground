import { useDraggable } from "@dnd-kit/core";
import { Card } from "./Card";
import type { CardInstance } from "../types/game-state";

interface DraggableCardProps {
  instance: CardInstance;
  onClick?: () => void;
}

export function DraggableCard({ instance, onClick }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: instance.instanceId });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : undefined,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} onClick={onClick}>
      <Card
        card={instance.card}
        damageCounters={instance.damageCounters}
        attachedEnergies={instance.attachedEnergies.length}
        attachedTool={instance.attachedTool}
      />
    </div>
  );
}
