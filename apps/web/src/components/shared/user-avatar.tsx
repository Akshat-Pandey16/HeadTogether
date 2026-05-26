import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";
import type { UserPublic } from "@/types";

type Props = {
  user: Pick<UserPublic, "first_name" | "last_name" | "avatar_url">;
  className?: string;
};

export const UserAvatar = ({ user, className }: Props) => (
  <Avatar className={cn(className)}>
    {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.first_name} /> : null}
    <AvatarFallback>{initials(user.first_name, user.last_name)}</AvatarFallback>
  </Avatar>
);
