import { useState } from "react";

interface DeckImportProps {
  onImport: (text: string) => void;
}

export function DeckImport({ onImport }: DeckImportProps) {
  const [text, setText] = useState("");

  return (
    <div className="deck-import">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="デッキリストをペーストしてください..."
        rows={15}
      />
      <button onClick={() => onImport(text)} disabled={!text.trim()}>
        デッキ読み込み
      </button>
    </div>
  );
}
