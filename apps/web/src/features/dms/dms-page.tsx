import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { dmsApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingPage } from "@/components/shared/loading";

export const DMsPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["dms"],
    queryFn: () => dmsApi.list(),
  });

  if (isLoading) return <LoadingPage label="Loading DMs" />;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Direct messages</h1>
        <p className="text-sm text-muted-foreground">Private 1-on-1 conversations.</p>
      </div>

      {!data || data.length === 0 ? (
        <EmptyState
          icon={<MessageCircle className="h-5 w-5" />}
          title="No conversations yet"
          description="Start a DM from someone's profile."
        />
      ) : (
        <div className="space-y-2">
          {data.map((room) => (
            <Link key={room.id} to={`/rooms/${room.id}/chat`}>
              <Card className="transition hover:bg-accent/40">
                <CardContent className="p-4">
                  <p className="font-medium">{room.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(room.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
