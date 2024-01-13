import { api } from "../api";
import { useAtom } from "jotai";
import { storageAtom } from "../store";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useHistory } from "react-router";
import { Link } from "react-router-dom";

import { Storage } from "@/types/storage";
import { cn } from "@/lib/utils";

const Login = () => {
  const { toast } = useToast();

  const [storage, setStorage] = useAtom(storageAtom);
  const history = useHistory();
  const [input, setInput] = useState({
    username: "",
    password: "",
  });

  const setTokenToStorage = (token: string) => {
    setStorage((p: any) => ({ ...p, token: token }));
  };

  const handleLogin = async () => {
    if (storage?.token) {
      history.push("/home");
    }

    const data = await api.user.login({
      username: input.username,
      password: input.password,
    });

    if (data.access_token) {
      setTokenToStorage(data.access_token);

      const user = await api.user.getUser({ token: data.access_token });
      if (user) {
        setStorage((p: any) => ({
          ...p,
          name: user.Name,
          email: user.EmailId,
        }));
        history.push("/dashboard");
        toast({
          title: "Loggedin Successfully",
          description: "Welcome!",
          className: cn(
            "bottom-5 right-0 flex fixed  md:top-4 md:right-4  text-blue-600 bg-muted border-blue-600 mx-3 w-[calc(100%-20px)]  "
          ),
        });
      }
    }
  };

  return (
    <div className="w-full text-white h-full flex flex-col justify-center items-center">
      <div className="text-black text-3xl ">Login</div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center"></div>

        <div>
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-bold mb-2">
              Username
            </label>
            <input
              value={input.username}
              onChange={(e) =>
                setInput((p) => ({ ...p, username: e.target.value }))
              }
              name="username"
              className=" border-b-2 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="username"
              type="text"
              placeholder="Username"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-bold mb-2">
              Password
            </label>
            <input
              name="password"
              value={input.password}
              onChange={(e) =>
                setInput((p) => ({ ...p, password: e.target.value }))
              }
              className=" border-b-2 rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              id="password"
              type="password"
              placeholder="*****"
            />
          </div>
          <div className="flex flex-col gap-2 items-center justify-between">
            <button
              type="button"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              onClick={handleLogin}
            >
              Sign In
            </button>

            <div className="text-black">
              Don't have a account? <Link to="/signup">Sign Up</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
