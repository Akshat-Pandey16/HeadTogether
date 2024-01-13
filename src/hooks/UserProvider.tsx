import { User } from "../types/user";
import { createContext, useContext, useState } from "react";

export const UserContext = createContext<{
  user: User | undefined;
  setUser: (user: User) => void;
}>({
  user: undefined,
  setUser: () => {},
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | undefined>(undefined);

  return (
    <UserContext.Provider value={{ user , setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const { user, setUser } = useContext(UserContext);

//   if (user === undefined || setUser === undefined) {
//     throw new Error("useUserContext must be used within a UserProvider");
//   }

  return { user, setUser };
};
