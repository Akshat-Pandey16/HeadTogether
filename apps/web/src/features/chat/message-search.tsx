import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useDebounce } from "@/hooks/use-debounce";
import { messagesApi } from "@/lib/api";

type Props = { roomId: string };

export const MessageSearch = ({ roomId }: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 300);

  const results = useQuery({
    queryKey: ["messages", roomId, "search", debounced],
    queryFn: () => messagesApi.search(roomId, debounced, 30),
    enabled: open && debounced.trim().length >= 2,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Search className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Search messages</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search this room…"
              className="pl-9 pr-9"
              autoFocus
            />
            {query && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="max-h-[55vh] overflow-y-auto rounded-md border border-border">
            {debounced.trim().length < 2 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search.
              </p>
            ) : results.isLoading ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Searching…</p>
            ) : !results.data || results.data.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No matches.</p>
            ) : (
              <ul className="divide-y divide-border">
                {results.data.map((m) => (
                  <li key={m.id} className="flex gap-3 p-3">
                    <UserAvatar user={m.sender} className="mt-0.5 h-8 w-8" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="flex items-baseline gap-2">
                        <span className="text-sm font-medium">
                          {m.sender.first_name} {m.sender.last_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                        </span>
                      </p>
                      <p className="line-clamp-3 whitespace-pre-wrap text-sm">{m.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
