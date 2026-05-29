import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { v4 as uuid } from "uuid";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { errorMessage } from "@/lib/api-error";
import type { Message, MessageCreatePayload } from "@/types";

type Props = {
  replyTo: Message | null;
  onClearReply: () => void;
  onSend: (payload: MessageCreatePayload) => Promise<unknown>;
  onTypingStart: () => void;
  onTypingStop: () => void;
};

export const MessageComposer = ({
  replyTo,
  onClearReply,
  onSend,
  onTypingStart,
  onTypingStop,
}: Props) => {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const submit = async () => {
    const body = value.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await onSend({
        body,
        parent_message_id: replyTo?.id ?? null,
        client_message_id: uuid(),
      });
      setValue("");
      onClearReply();
      onTypingStop();
    } catch (e) {
      toast({ variant: "destructive", title: "Send failed", description: errorMessage(e) });
    } finally {
      setSending(false);
    }
  };

  const handleChange = (next: string) => {
    setValue(next);
    if (next.length > 0) {
      onTypingStart();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTypingStop(), 3000);
    } else {
      onTypingStop();
    }
  };

  return (
    <div className="border-t-2 border-ink bg-card p-3">
      {replyTo && (
        <div className="mb-2 flex items-start justify-between gap-3 rounded-sm border-2 border-ink bg-secondary px-3 py-2 text-xs">
          <div className="min-w-0 border-l-2 border-acid pl-2">
            <p className="font-bold">
              Replying to {replyTo.sender.first_name} {replyTo.sender.last_name}
            </p>
            <p className="line-clamp-1 text-muted-foreground">{replyTo.body}</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClearReply}>
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Type a message…  (Enter to send, Shift+Enter for newline)"
          className="min-h-[44px] resize-none"
          rows={1}
          maxLength={4000}
        />
        <Button onClick={submit} variant="acid" disabled={!value.trim() || sending} size="icon">
          <Send className="h-4 w-4" strokeWidth={2.5} />
        </Button>
      </div>
    </div>
  );
};
