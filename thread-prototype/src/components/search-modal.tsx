"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Hash } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchMessages, type SearchResult } from "@/app/actions/search";

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
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

  const handleSearch = useCallback((value: string) => {
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!value.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchMessages(value);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(
      `/channels/${result.channel_id}?highlight=${result.message_id}`,
    );
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setResults([]);
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

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Search Messages"
      description="Search for messages across all channels"
    >
      <CommandInput
        placeholder="Search messages..."
        value={query}
        onValueChange={handleSearch}
      />
      <CommandList>
        {loading && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Searching...
          </div>
        )}
        {!loading && query.trim() && results.length === 0 && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}
        {!loading && results.length > 0 && (
          <CommandGroup heading="Messages">
            {results.map((result) => (
              <CommandItem
                key={result.message_id}
                value={result.message_id}
                onSelect={() => handleSelect(result)}
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
        {!loading && !query.trim() && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Type to search messages across all channels
          </div>
        )}
      </CommandList>
    </CommandDialog>
  );
}
