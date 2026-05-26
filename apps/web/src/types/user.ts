import type { Gender } from "./enums";
import type { Tag } from "./tag";

export type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  gender: Gender;
  age: number;
  is_active: boolean;
  last_login_at: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export type UserPublic = {
  id: string;
  first_name: string;
  last_name: string;
  gender: Gender;
  age: number;
  avatar_url: string | null;
  bio: string | null;
};

export type UserProfile = UserPublic & {
  tags: Tag[];
};

export type UserUpdate = Partial<{
  first_name: string;
  last_name: string;
  age: number;
  gender: Gender;
  bio: string;
  avatar_url: string;
}>;
