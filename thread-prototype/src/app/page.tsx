import { Hash } from "lucide-react";

export default function Home() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="rounded-full bg-muted p-4">
        <Hash className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="mt-4 text-xl font-semibold">Welcome to Threads</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Select a channel from the sidebar to get started, or create a new one.
      </p>
    </div>
  );
}
