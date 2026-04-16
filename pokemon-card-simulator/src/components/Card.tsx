import { useState } from "react";
import type { Card as CardType } from "../types/card";

interface CardProps {
  card: CardType;
  damageCounters?: number;
}

export function Card({ card, damageCounters }: CardProps) {
  const [imageError, setImageError] = useState(false);

  if (imageError || !card.image_url) {
    return (
      <div className="card card-fallback">
        <div className="card-name">{card.name}</div>
        <div className="card-category">{card.card_category}</div>
        {damageCounters ? (
          <div className="damage-counter">{damageCounters}</div>
        ) : null}
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
      {damageCounters ? (
        <div className="damage-counter">{damageCounters}</div>
      ) : null}
    </div>
  );
}
