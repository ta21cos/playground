import { useDroppable } from "@dnd-kit/core";
import type { ZoneName } from "../types/zone";

interface DroppableZoneProps {
  zoneName: ZoneName;
  children: React.ReactNode;
  cardCount: number;
  onZoneClick?: () => void;
}

export function DroppableZone({
  zoneName,
  children,
  cardCount,
  onZoneClick,
}: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({ id: zoneName });

  return (
    <div
      ref={setNodeRef}
      className={`zone zone-${zoneName} ${isOver ? "zone-over" : ""}`}
      onClick={onZoneClick}
    >
      <div className="zone-header">
        <span className="zone-name">{zoneName}</span>
        <span className="zone-count">{cardCount}</span>
      </div>
      <div className="zone-cards">{children}</div>
    </div>
  );
}
