import { useDroppable } from "@dnd-kit/core";
import type { ZoneName } from "../types/zone";

interface DroppableZoneProps {
  zoneName: ZoneName;
  label?: string;
  children: React.ReactNode;
  cardCount: number;
  onZoneClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

export function DroppableZone({
  zoneName,
  label,
  children,
  cardCount,
  onZoneClick,
  style,
}: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({ id: zoneName });

  return (
    <div
      ref={setNodeRef}
      className={`zone zone-${zoneName} ${isOver ? "zone-over" : ""}`}
      data-zone={zoneName}
      onClick={onZoneClick}
      style={style}
    >
      <div className="zone-header">
        <div className="zone-labels">
          {label && <span className="zone-label-en">{label}</span>}
          <span className="zone-name">{zoneName}</span>
        </div>
        <span className="zone-count">{cardCount}</span>
      </div>
      <div className="zone-cards">{children}</div>
    </div>
  );
}
