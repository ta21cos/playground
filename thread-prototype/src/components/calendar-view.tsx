"use client";

import { useCallback, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getMessageCountsByDay,
  type CalendarDayCount,
} from "@/app/actions/search";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { day: number | null; dateStr: string | null }[] = [];

  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push({ day: null, dateStr: null });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateStr });
  }

  while (cells.length < 42) {
    cells.push({ day: null, dateStr: null });
  }

  return cells;
}

function toYearMonth(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function CalendarView({ channelId }: { channelId: number }) {
  const [collapsed, setCollapsed] = useState(true);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [dayCounts, setDayCounts] = useState<Record<string, number>>({});
  const [isPending, startTransition] = useTransition();

  const fetchCounts = useCallback(
    async (ym: string) => {
      const data = await getMessageCountsByDay(channelId, ym);
      const map: Record<string, number> = {};
      data.forEach((d: CalendarDayCount) => {
        map[d.day] = d.count;
      });
      setDayCounts(map);
    },
    [channelId],
  );

  const handleToggle = () => {
    const nextCollapsed = !collapsed;
    setCollapsed(nextCollapsed);
    if (!nextCollapsed) {
      startTransition(() => {
        fetchCounts(toYearMonth(year, month));
      });
    }
  };

  const goToPrevMonth = () => {
    const newMonth = month === 0 ? 11 : month - 1;
    const newYear = month === 0 ? year - 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    startTransition(() => {
      fetchCounts(toYearMonth(newYear, newMonth));
    });
  };

  const goToNextMonth = () => {
    const newMonth = month === 11 ? 0 : month + 1;
    const newYear = month === 11 ? year + 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    startTransition(() => {
      fetchCounts(toYearMonth(newYear, newMonth));
    });
  };

  const cells = buildCalendarGrid(year, month);
  const monthName = new Date(year, month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="border-b">
      <button
        onClick={handleToggle}
        className="flex w-full items-center gap-2 px-1 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <Calendar className="h-3.5 w-3.5" />
        <span>Calendar</span>
        <span className="ml-auto">{collapsed ? "+" : "-"}</span>
      </button>

      {!collapsed && (
        <div className="px-1 pb-3">
          <div className="mb-2 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={goToPrevMonth}
              disabled={isPending}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-medium">{monthName}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={goToNextMonth}
              disabled={isPending}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-0">
            {DAYS_OF_WEEK.map((d) => (
              <div
                key={d}
                className="pb-1 text-center text-[10px] text-muted-foreground"
              >
                {d}
              </div>
            ))}
            {cells.map((cell, i) => {
              const hasMessages = cell.dateStr && dayCounts[cell.dateStr] > 0;
              const isToday = cell.dateStr === todayStr;
              return (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center py-0.5"
                >
                  {cell.day !== null ? (
                    <>
                      <span
                        className={`text-[11px] leading-tight ${
                          isToday
                            ? "font-bold text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        {cell.day}
                      </span>
                      {hasMessages && (
                        <span className="mt-0.5 inline-block h-1 w-1 rounded-full bg-primary" />
                      )}
                    </>
                  ) : (
                    <span className="text-[11px] leading-tight">&nbsp;</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
