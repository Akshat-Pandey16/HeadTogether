import { Button } from "@/components/ui/button";
import React from "react";
import { Link } from "react-router-dom";
import img from "../assets/3369736.jpg"
const Info = () => {
  return (
    <div className="text-black h-screen flex gap-5 flex-col justify-center items-center">
        <img src={img} alt="" className="w-[40vh]"/>
        <div className="text-2xl font-bold">
            Head Together
        </div>
        <div className="text-sm text-center">
        Discover, Connect, and Explore Together with HeadTogether
        </div>
      <Link to={"/login"}>
        <Button className="border py-4 px-6 rounded-lg">Get Started</Button>
      </Link>
    </div>
  );
};

export default Info;
