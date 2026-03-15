import { useState } from "react";
import { isValidDeckCode } from "../domain/deck-code-parser";

type ImportMode = "text" | "code";

interface DeckImportProps {
  onImportText: (text: string) => void;
  onImportCode: (code: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function DeckImport({ onImportText, onImportCode, loading, error }: DeckImportProps) {
  const [mode, setMode] = useState<ImportMode>("code");
  const [text, setText] = useState("");
  const [code, setCode] = useState("");

  return (
    <div className="deck-import">
      <div className="import-tabs">
        <button
          className={mode === "code" ? "tab active" : "tab"}
          onClick={() => setMode("code")}
        >
          デッキコード
        </button>
        <button
          className={mode === "text" ? "tab active" : "tab"}
          onClick={() => setMode("text")}
        >
          テキスト入力
        </button>
      </div>

      {error && (
        <div style={{ color: "#e74c3c", padding: "8px", fontSize: "14px" }}>
          {error}
        </div>
      )}

      {mode === "code" ? (
        <>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="例: xYcD8c-E3GkJG-8Jcccx"
            className="deck-code-input"
          />
          <button
            onClick={() => onImportCode(code)}
            disabled={!isValidDeckCode(code) || loading}
          >
            {loading ? "読み込み中..." : "デッキコードで読み込み"}
          </button>
        </>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="デッキリストをペーストしてください..."
            rows={15}
          />
          <button onClick={() => onImportText(text)} disabled={!text.trim()}>
            デッキ読み込み
          </button>
        </>
      )}
    </div>
  );
}
