"use client";

import { Rating, type Grade } from "@/lib/fsrs";

interface RatingButtonsProps {
  intervals: Record<Grade, string>;
  onRate: (grade: Grade) => void;
  disabled?: boolean;
}

const BUTTONS: { grade: Grade; label: string; color: string }[] = [
  { grade: Rating.Again, label: "Again", color: "bg-red-500 hover:bg-red-600" },
  {
    grade: Rating.Hard,
    label: "Hard",
    color: "bg-orange-500 hover:bg-orange-600",
  },
  {
    grade: Rating.Good,
    label: "Good",
    color: "bg-green-500 hover:bg-green-600",
  },
  { grade: Rating.Easy, label: "Easy", color: "bg-blue-500 hover:bg-blue-600" },
];

export function RatingButtons({
  intervals,
  onRate,
  disabled,
}: RatingButtonsProps) {
  return (
    <div className="mt-6 grid grid-cols-4 gap-2">
      {BUTTONS.map(({ grade, label, color }) => (
        <button
          key={grade}
          onClick={() => onRate(grade)}
          disabled={disabled}
          className={`flex flex-col items-center rounded-lg px-2 py-3 text-white transition-colors disabled:opacity-50 ${color}`}
        >
          <span className="text-xs font-medium">{label}</span>
          <span className="mt-1 text-[10px] opacity-80">
            {intervals[grade]}
          </span>
        </button>
      ))}
    </div>
  );
}
