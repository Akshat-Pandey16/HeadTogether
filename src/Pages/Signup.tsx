import { api } from "@/api";
import { useToast } from "../components/ui/use-toast";

import { useState } from "react";
import { useHistory } from "react-router";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

function Signup() {

  const { toast } = useToast();
  const history = useHistory();
  const [input, setInput] = useState({
    email: "",
    password: "",
    name: "",
    last_name: "",
    gender: "",
    age: "",
  });



  const handleSignup = async () => {
    const data = await api.user.signup({
      name: input.name,
      last_name: input.last_name,
      email: input.email,
      age: input.age,
      gender: input.gender,
      password: input.password,
    });
    console.log(data);

    if (data) {
      toast({
        title: "Signed up Successfully",
        description: "",
        className: cn(
          "bottom-5 right-0 flex fixed  md:top-4 md:right-4  text-red-600 bg-muted border-red-600 mx-3 w-[calc(100%-20px)]  "
        ),
      });
      history.push("/login");
    }
  };

  return (
    <div className="w-full text-white flex-col h-full flex justify-center items-center px-4">
      <div className="text-2xl text-black mt-10">Sign Up</div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center"></div>

        <div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-bold mb-2">
              Email
            </label>
            <input
              name="email"
              value={input.email}
              onChange={(e) =>
                setInput((p) => ({ ...p, email: e.target.value }))
              }
              className=" border-b-2 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="email"
              type="text"
              placeholder="Email"
            />
          </div>
         <div className="flex gap-2">
         <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-bold mb-2">
              Name
            </label>
            <input
              name="name"
              value={input.name}
              onChange={(e) =>
                setInput((p) => ({ ...p, name: e.target.value }))
              }
              className="border-b-2 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="name"
              type="text"
              placeholder="Name"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="last_name" className="block text-sm font-bold mb-2">
              Last Name
            </label>
            <input
              name="last_name"
              value={input.last_name}
              onChange={(e) =>
                setInput((p) => ({ ...p, last_name: e.target.value }))
              }
              className="border-b-2 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="last_name"
              type="text"
              placeholder="Last Name"
            />
          </div>
         </div>
          <div className="mb-4">
            <label htmlFor="gender" className="block text-sm font-bold mb-2">
              Gender
            </label>
            <input
              name="gender"
              value={input.gender}
              onChange={(e) =>
                setInput((p) => ({ ...p, gender: e.target.value }))
              }
              className="border-b-2 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="gender"
              type="text"
              placeholder="Gender"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="age" className="block text-sm font-bold mb-2">
              Age
            </label>
            <input
              name="age"
              value={input.age}
              onChange={(e) => setInput((p) => ({ ...p, age: e.target.value }))}
              className="border-b-2 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="age"
              type="text"
              placeholder="Age"
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
              className="border-b-2 rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              id="password"
              type="password"
              placeholder="*****"
            />
          </div>
          <div className="flex flex-col gap-3 items-center justify-between">
            <button
              type="button"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              onClick={handleSignup}
            >
              Sign Up
            </button>

            <div className="text-black">
              Already have a account <Link to="/login">Login</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
