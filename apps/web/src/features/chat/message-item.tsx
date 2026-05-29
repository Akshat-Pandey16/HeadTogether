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
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useConfirm } from "@/providers/confirm-provider";
import { clockTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MessageType, type Message } from "@/types";

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
  const confirm = useConfirm();
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

  if (message.message_type === MessageType.SYSTEM) {
    return (
      <div className="flex justify-center py-1">
        <span className="rounded-sm border-2 border-dashed border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {message.body}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex gap-3 rounded-sm px-2 py-1.5 transition hover:bg-secondary/60",
        isPinned && "border-l-4 border-acid bg-acid/5",
        message.deleted_at && "opacity-50",
      )}
    >
      <UserAvatar user={message.sender} className="mt-0.5 h-8 w-8" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold">
            {message.sender.first_name} {message.sender.last_name}
          </span>
          <span className="font-mono text-[10px] uppercase text-muted-foreground">
            {clockTime(message.created_at)}
            {message.edited_at && <span className="ml-1 normal-case italic">· edited</span>}
          </span>
          {isPinned && (
            <span className="inline-flex items-center gap-0.5 font-mono text-[10px] uppercase text-acid-foreground">
              <Pin className="h-3 w-3 fill-acid text-acid" strokeWidth={2.5} />
            </span>
          )}
        </div>

        {parent && (
          <div className="mt-1 flex items-center gap-1.5 border-l-2 border-acid pl-2 font-mono text-[11px] text-muted-foreground">
            <Reply className="h-3 w-3 shrink-0" strokeWidth={2.5} />
            <span className="font-bold">{parent.sender.first_name}:</span>
            <span className="line-clamp-1">{parent.body}</span>
          </div>
        )}

        {editing ? (
          <div className="mt-1 space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitEdit();
                }
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="acid" onClick={submitEdit}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : message.deleted_at ? (
          <p className="font-mono text-xs italic text-muted-foreground">message deleted</p>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
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
                  "inline-flex items-center gap-1 rounded-sm border-2 border-ink px-1.5 py-0.5 font-mono text-[11px] font-bold transition",
                  r.reacted_by_me ? "bg-acid text-acid-foreground" : "bg-card hover:bg-secondary",
                )}
              >
                <span className="text-xs leading-none">{r.emoji}</span>
                {r.count}
              </button>
            ))}
          </div>
        )}
      </div>

      {!message.deleted_at && (
        <div className="absolute right-2 top-1 flex items-center gap-0.5 rounded-sm border-2 border-ink bg-card opacity-100 shadow-brutal-sm transition md:opacity-0 md:group-hover:opacity-100">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="border-0">
                <Smile className="h-4 w-4" strokeWidth={2.25} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="flex w-auto gap-1 p-1.5">
              {QUICK_REACTIONS.map((e) => {
                const mine = message.reactions.find((r) => r.emoji === e)?.reacted_by_me;
                return (
                  <button
                    key={e}
                    onClick={() =>
                      mine ? onRemoveReaction(message.id, e) : onAddReaction(message.id, e)
                    }
                    className={cn(
                      "rounded-sm p-1 text-lg transition hover:bg-secondary",
                      mine && "bg-acid",
                    )}
                  >
                    {e}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon-sm"
            className="border-0"
            onClick={() => onReply(message)}
          >
            <Reply className="h-4 w-4" strokeWidth={2.25} />
          </Button>
          {(canEdit || canDelete || isModerator) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="border-0">
                  <MoreHorizontal className="h-4 w-4" strokeWidth={2.25} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => setEditing(true)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </DropdownMenuItem>
                )}
                {isModerator && !isPinned && (
                  <DropdownMenuItem onClick={() => onPin(message.id)}>
                    <Pin className="h-4 w-4" /> Pin
                  </DropdownMenuItem>
                )}
                {isModerator && isPinned && (
                  <DropdownMenuItem onClick={() => onUnpin(message.id)}>
                    <PinOff className="h-4 w-4" /> Unpin
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                      onClick={async () => {
                        if (
                          await confirm({
                            title: "Delete message?",
                            description: "This message will be removed for everyone.",
                            confirmText: "Delete",
                            destructive: true,
                          })
                        )
                          onDelete(message.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  );
};
