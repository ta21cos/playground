"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Dexie from "dexie";
import { db } from "@/lib/db";
import { BookOpen } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const decks = useLiveQuery(() => db.decks.toArray());

  if (decks === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6">
        <BookOpen className="size-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">デッキがありません</h1>
        <p className="text-center text-muted-foreground">
          インポートタブからカードを追加しましょう
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold">デッキ</h1>
      <div className="space-y-3">
        {decks.map((deck) => (
          <DeckItem key={deck.id} deck={deck} />
        ))}
      </div>
    </div>
  );
}

function DeckItem({ deck }: { deck: { id: string; name: string } }) {
  const cardCount = useLiveQuery(
    () => db.cards.where("deckId").equals(deck.id).count(),
    [deck.id],
  );

  const [now] = useState(() => Date.now());
  const dueCount = useLiveQuery(
    () =>
      db.cards
        .where("[deckId+due]")
        .between([deck.id, Dexie.minKey], [deck.id, now], true, true)
        .count(),
    [deck.id, now],
  );

  return (
    <Link
      href={`/study/${deck.id}`}
      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
    >
      <div>
        <h2 className="font-medium">{deck.name}</h2>
        <p className="text-sm text-muted-foreground">{cardCount ?? 0} 枚</p>
      </div>
      <div className="flex items-center gap-2">
        {(dueCount ?? 0) > 0 && (
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
            {dueCount}
          </span>
        )}
        <BookOpen className="size-5 text-muted-foreground" />
      </div>
    </Link>
  );
}
