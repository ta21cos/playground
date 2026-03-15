import type { ZoneName } from "../types/zone";

interface ZoneProps {
  name: ZoneName;
  cardCount: number;
  children?: React.ReactNode;
  onZoneClick?: () => void;
}

export function Zone({ name, cardCount, children, onZoneClick }: ZoneProps) {
  return (
    <div className={`zone zone-${name}`} onClick={onZoneClick}>
      <div className="zone-header">
        <span className="zone-name">{name}</span>
        <span className="zone-count">{cardCount}</span>
      </div>
      <div className="zone-cards">{children}</div>
    </div>
  );
}
