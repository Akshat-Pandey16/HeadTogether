import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { errorMessage } from "@/lib/api-error";
import type { RoomDetailItem } from "@/types";
import {
  useAddRoomDetail,
  useDeleteRoomDetail,
  useUpdateRoomDetail,
} from "./room-queries";

type Props = {
  roomId: string;
  details: RoomDetailItem[];
  canManage: boolean;
};

export const RoomDetailsPanel = ({ roomId, details, canManage }: Props) => {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const add = useAddRoomDetail(roomId);
  const update = useUpdateRoomDetail(roomId);
  const remove = useDeleteRoomDetail(roomId);

  const reset = () => {
    setHeading("");
    setBody("");
    setCreating(false);
    setEditingId(null);
  };

  const startEdit = (d: RoomDetailItem) => {
    setEditingId(d.id);
    setHeading(d.heading);
    setBody(d.body);
    setCreating(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = heading.trim();
    const b = body.trim();
    if (!h || !b) return;
    try {
      if (editingId) {
        await update.mutateAsync({ detailId: editingId, payload: { heading: h, body: b } });
        toast({ title: "Section updated" });
      } else {
        await add.mutateAsync({ heading: h, body: b });
        toast({ title: "Section added" });
      }
      reset();
    } catch (e) {
      toast({ variant: "destructive", description: errorMessage(e) });
    }
  };

  const handleDelete = async (detail: RoomDetailItem) => {
    if (!window.confirm(`Remove section "${detail.heading}"?`)) return;
    try {
      await remove.mutateAsync(detail.id);
      toast({ title: "Section removed" });
    } catch (e) {
      toast({ variant: "destructive", description: errorMessage(e) });
    }
  };

  const editing = editingId !== null;

  return (
    <div className="space-y-3">
      {details.length === 0 && !creating && !editing && (
        <p className="text-sm text-muted-foreground">No additional details added.</p>
      )}
      {details.map((d) =>
        editingId === d.id ? null : (
          <Card key={d.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <CardTitle className="text-base">{d.heading}</CardTitle>
              {canManage && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => startEdit(d)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(d)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm">{d.body}</CardContent>
          </Card>
        ),
      )}

      {(creating || editing) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">
              {editing ? "Edit section" : "New section"}
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reset}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="detail_heading">Heading</Label>
                <Input
                  id="detail_heading"
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  required
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="detail_body">Body</Label>
                <Textarea
                  id="detail_body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  maxLength={2000}
                  rows={5}
                />
              </div>
              <Button type="submit" disabled={add.isPending || update.isPending}>
                {editing ? "Save" : "Add section"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {canManage && !creating && !editing && (
        <Button variant="outline" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Add section
        </Button>
      )}
    </div>
  );
};
