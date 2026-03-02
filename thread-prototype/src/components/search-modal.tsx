"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Hash, Inbox, Tag } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  searchMessages,
  searchStocks,
  searchAll,
  type SearchResult,
  type StockSearchResult,
  type UnifiedSearchResult,
} from "@/app/actions/search";

type TabValue = "all" | "messages" | "notes";

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabValue>("all");
  const [messageResults, setMessageResults] = useState<SearchResult[]>([]);
  const [stockResults, setStockResults] = useState<StockSearchResult[]>([]);
  const [allResults, setAllResults] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const performSearch = useCallback(
    async (value: string, activeTab: TabValue) => {
      setLoading(true);
      try {
        if (activeTab === "all") {
          const data = await searchAll(value);
          setAllResults(data);
        } else if (activeTab === "messages") {
          const data = await searchMessages(value);
          setMessageResults(data);
        } else {
          const data = await searchStocks(value, "note");
          setStockResults(data);
        }
      } catch {
        setAllResults([]);
        setMessageResults([]);
        setStockResults([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!value.trim()) {
        setMessageResults([]);
        setStockResults([]);
        setAllResults([]);
        return;
      }

      debounceRef.current = setTimeout(() => performSearch(value, tab), 300);
    },
    [tab, performSearch],
  );

  const handleTabChange = useCallback(
    (newTab: TabValue) => {
      setTab(newTab);
      if (query.trim()) {
        performSearch(query, newTab);
      }
    },
    [query, performSearch],
  );

  const handleSelectMessage = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    resetResults();
    router.push(
      `/channels/${result.channel_id}?highlight=${result.message_id}`,
    );
  };

  const handleSelectStock = (stockId: string, status: string) => {
    setOpen(false);
    setQuery("");
    resetResults();
    if (status === "note") {
      router.push(`/notes/${stockId}`);
    } else {
      router.push("/inbox");
    }
  };

  const handleSelectUnified = (result: UnifiedSearchResult) => {
    setOpen(false);
    setQuery("");
    resetResults();
    if (result.type === "message") {
      router.push(`/channels/${result.channel_id}?highlight=${result.id}`);
    } else if (result.status === "note") {
      router.push(`/notes/${result.stock_id}`);
    } else {
      router.push("/inbox");
    }
  };

  const resetResults = () => {
    setMessageResults([]);
    setStockResults([]);
    setAllResults([]);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setTab("all");
      resetResults();
    }
  };

  function formatTimestamp(isoString: string) {
    const date = new Date(isoString + "Z");
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const hasResults =
    tab === "all"
      ? allResults.length > 0
      : tab === "messages"
        ? messageResults.length > 0
        : stockResults.length > 0;

  const tabs: { value: TabValue; label: string }[] = [
    { value: "all", label: "All" },
    { value: "messages", label: "Messages" },
    { value: "notes", label: "Notes" },
  ];

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Search"
      description="Search messages and notes across all channels"
    >
      <CommandInput
        placeholder="Search messages and notes..."
        value={query}
        onValueChange={handleSearch}
      />
      <div className="flex gap-1 border-b px-3 py-2">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => handleTabChange(t.value)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              tab === t.value
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <CommandList>
        {loading && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Searching...
          </div>
        )}
        {!loading && query.trim() && !hasResults && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}

        {!loading && tab === "all" && allResults.length > 0 && (
          <>
            {allResults.some((r) => r.type === "message") && (
              <CommandGroup heading="Messages">
                {allResults
                  .filter((r) => r.type === "message")
                  .map((result) => (
                    <CommandItem
                      key={`msg-${result.id}`}
                      value={`msg-${result.id}`}
                      onSelect={() => handleSelectUnified(result)}
                      className="flex flex-col items-start gap-1"
                    >
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        <span>{result.channel_name}</span>
                        <span>·</span>
                        <span>{formatTimestamp(result.created_at)}</span>
                      </div>
                      <div
                        className="text-sm [&_mark]:rounded-sm [&_mark]:bg-yellow-200 [&_mark]:px-0.5 dark:[&_mark]:bg-yellow-800"
                        dangerouslySetInnerHTML={{ __html: result.snippet }}
                      />
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
            {allResults.some((r) => r.type === "stock") && (
              <CommandGroup heading="Notes & Inbox">
                {allResults
                  .filter((r) => r.type === "stock")
                  .map((result) => (
                    <CommandItem
                      key={`stock-${result.stock_id}`}
                      value={`stock-${result.stock_id}`}
                      onSelect={() => handleSelectUnified(result)}
                      className="flex flex-col items-start gap-1"
                    >
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        <span className="font-medium text-foreground">
                          {result.title}
                        </span>
                        <span>·</span>
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            result.status === "note"
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          }`}
                        >
                          {result.status === "note" ? "Note" : "Inbox"}
                        </span>
                        <span>·</span>
                        <span>{formatTimestamp(result.created_at)}</span>
                      </div>
                      {(result.group_name || result.tags) && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {result.group_name && (
                            <>
                              <Inbox className="h-3 w-3" />
                              <span>{result.group_name}</span>
                            </>
                          )}
                          {result.tags && (
                            <>
                              <Tag className="h-3 w-3" />
                              <span>{result.tags}</span>
                            </>
                          )}
                        </div>
                      )}
                      <div
                        className="text-sm [&_mark]:rounded-sm [&_mark]:bg-yellow-200 [&_mark]:px-0.5 dark:[&_mark]:bg-yellow-800"
                        dangerouslySetInnerHTML={{ __html: result.snippet }}
                      />
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
          </>
        )}

        {!loading && tab === "messages" && messageResults.length > 0 && (
          <CommandGroup heading="Messages">
            {messageResults.map((result) => (
              <CommandItem
                key={result.message_id}
                value={result.message_id}
                onSelect={() => handleSelectMessage(result)}
                className="flex flex-col items-start gap-1"
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Hash className="h-3 w-3" />
                  <span>{result.channel_name}</span>
                  <span>·</span>
                  <span>{formatTimestamp(result.created_at)}</span>
                </div>
                <div
                  className="text-sm [&_mark]:rounded-sm [&_mark]:bg-yellow-200 [&_mark]:px-0.5 dark:[&_mark]:bg-yellow-800"
                  dangerouslySetInnerHTML={{ __html: result.snippet }}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!loading && tab === "notes" && stockResults.length > 0 && (
          <CommandGroup heading="Notes">
            {stockResults.map((result) => (
              <CommandItem
                key={result.stock_id}
                value={result.stock_id}
                onSelect={() =>
                  handleSelectStock(result.stock_id, result.status)
                }
                className="flex flex-col items-start gap-1"
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span className="font-medium text-foreground">
                    {result.title}
                  </span>
                  <span>·</span>
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      result.status === "note"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    }`}
                  >
                    {result.status === "note" ? "Note" : "Inbox"}
                  </span>
                  <span>·</span>
                  <span>{formatTimestamp(result.created_at)}</span>
                </div>
                {(result.group_name || result.tags) && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {result.group_name && (
                      <>
                        <Inbox className="h-3 w-3" />
                        <span>{result.group_name}</span>
                      </>
                    )}
                    {result.tags && (
                      <>
                        <Tag className="h-3 w-3" />
                        <span>{result.tags}</span>
                      </>
                    )}
                  </div>
                )}
                <div
                  className="text-sm [&_mark]:rounded-sm [&_mark]:bg-yellow-200 [&_mark]:px-0.5 dark:[&_mark]:bg-yellow-800"
                  dangerouslySetInnerHTML={{ __html: result.snippet }}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!loading && !query.trim() && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Type to search messages and notes across all channels
          </div>
        )}
      </CommandList>
    </CommandDialog>
  );
}
