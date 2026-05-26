export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export type LoginPayload = { username: string; password: string };

export type RegisterPayload = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  age: number;
  gender: string;
};

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
};

export type ForgotPasswordPayload = { email: string };
export type ResetPasswordPayload = { token: string; new_password: string };
