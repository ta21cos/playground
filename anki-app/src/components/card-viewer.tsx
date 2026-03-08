"use client";

import DOMPurify from "isomorphic-dompurify";

interface CardViewerProps {
  front: string;
  back: string;
  onShowAnswer: () => void;
  showAnswer: boolean;
}

function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "b",
      "i",
      "u",
      "em",
      "strong",
      "br",
      "p",
      "div",
      "span",
      "ul",
      "ol",
      "li",
      "table",
      "tr",
      "td",
      "th",
      "thead",
      "tbody",
      "sub",
      "sup",
      "ruby",
      "rt",
      "hr",
      "blockquote",
      "pre",
      "code",
    ],
    ALLOWED_ATTR: ["class"],
  });
}

export function CardViewer({
  front,
  back,
  onShowAnswer,
  showAnswer,
}: CardViewerProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="perspective-1000 relative w-full">
        <div
          className={`relative w-full transition-transform duration-500 [transform-style:preserve-3d] ${showAnswer ? "[transform:rotateX(180deg)]" : ""}`}
        >
          <div className="backface-hidden flex min-h-[200px] items-center justify-center rounded-xl border bg-card p-6">
            <div
              className="text-center text-lg"
              dangerouslySetInnerHTML={{ __html: sanitize(front) }}
            />
          </div>

          <div className="backface-hidden absolute inset-0 flex min-h-[200px] items-center justify-center rounded-xl border bg-card p-6 [transform:rotateX(180deg)]">
            <div
              className="text-center text-lg"
              dangerouslySetInnerHTML={{ __html: sanitize(back) }}
            />
          </div>
        </div>
      </div>

      {!showAnswer && (
        <button
          onClick={onShowAnswer}
          className="mt-6 rounded-lg bg-primary px-8 py-3 text-primary-foreground transition-colors hover:bg-primary/90"
        >
          答えを見る
        </button>
      )}
    </div>
  );
}
