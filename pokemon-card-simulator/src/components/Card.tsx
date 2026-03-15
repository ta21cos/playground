import { useState } from "react";
import type { Card as CardType } from "../types/card";

interface CardProps {
  card: CardType;
  damageCounters?: number;
  attachedEnergies?: number;
  attachedTool?: string | null;
}

export function Card({ card, damageCounters, attachedEnergies, attachedTool }: CardProps) {
  const [imageError, setImageError] = useState(false);

  if (imageError || !card.image_url) {
    return (
      <div className="card card-fallback">
        <div className="card-name">{card.name}</div>
        <div className="card-category">{card.card_category}</div>
        {damageCounters ? <div className="damage-counter">{damageCounters}</div> : null}
      </div>
    );
  }

  return (
    <div className="card">
      <img
        src={card.image_url}
        alt={card.name}
        onError={() => setImageError(true)}
        loading="lazy"
      />
      {damageCounters ? <div className="damage-counter">{damageCounters}</div> : null}
      {attachedEnergies ? <div className="energy-count">{attachedEnergies}</div> : null}
      {attachedTool ? <div className="tool-indicator">{attachedTool}</div> : null}
    </div>
  );
}
