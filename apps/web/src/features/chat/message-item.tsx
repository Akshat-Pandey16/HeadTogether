import { useState } from "react";
import { MoreHorizontal, Pencil, Pin, PinOff, Reply, Smile, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";
import { formatDistanceToNow } from "date-fns";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "😮", "🙏"];

type Props = {
  message: Message;
  isOwnMessage: boolean;
  isModerator: boolean;
  isPinned: boolean;
  onReply: (m: Message) => void;
  onEdit: (m: Message, body: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  parent?: Message;
};

export const MessageItem = ({
  message,
  isOwnMessage,
  isModerator,
  isPinned,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onUnpin,
  onAddReaction,
  onRemoveReaction,
  parent,
}: Props) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body);
  const canEdit = isOwnMessage && !message.deleted_at;
  const canDelete = (isOwnMessage || isModerator) && !message.deleted_at;

  const submitEdit = () => {
    const next = draft.trim();
    if (!next || next === message.body) {
      setEditing(false);
      return;
    }
    onEdit(message, next);
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "group flex gap-3 rounded-lg px-2 py-1.5 transition hover:bg-muted/40",
        message.deleted_at && "opacity-50",
      )}
    >
      <UserAvatar user={message.sender} className="mt-1 h-8 w-8" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium">
            {message.sender.first_name} {message.sender.last_name}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            {message.edited_at && <span className="ml-1 italic">(edited)</span>}
          </span>
          {isPinned && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Pin className="h-3 w-3" /> pinned
            </span>
          )}
        </div>
        {parent && (
          <div className="mt-1 border-l-2 border-border pl-2 text-xs text-muted-foreground">
            <span className="font-medium">{parent.sender.first_name}: </span>
            <span className="line-clamp-1">{parent.body}</span>
          </div>
        )}
        {editing ? (
          <div className="mt-1 space-y-2">
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={submitEdit}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
        )}
        {message.reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() =>
                  r.reacted_by_me
                    ? onRemoveReaction(message.id, r.emoji)
                    : onAddReaction(message.id, r.emoji)
                }
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                  r.reacted_by_me
                    ? "border-foreground/30 bg-foreground/10"
                    : "border-border bg-card",
                )}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="opacity-0 transition group-hover:opacity-100">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="flex w-auto gap-1 p-2">
            {QUICK_REACTIONS.map((e) => (
              <button
                key={e}
                onClick={() => onAddReaction(message.id, e)}
                className="rounded-md p-1 text-lg hover:bg-muted"
              >
                {e}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onReply(message)}>
          <Reply className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && (
              <DropdownMenuItem onClick={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
            )}
            {isModerator && !isPinned && (
              <DropdownMenuItem onClick={() => onPin(message.id)}>
                <Pin className="mr-2 h-4 w-4" /> Pin
              </DropdownMenuItem>
            )}
            {isModerator && isPinned && (
              <DropdownMenuItem onClick={() => onUnpin(message.id)}>
                <PinOff className="mr-2 h-4 w-4" /> Unpin
              </DropdownMenuItem>
            )}
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    if (window.confirm("Delete this message?")) onDelete(message.id);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
