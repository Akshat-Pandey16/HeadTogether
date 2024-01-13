import { Link } from "react-router-dom";
import { Button } from "./button";
import { useAtom } from "jotai";
import { storageAtom } from "@/store";
import { BiUserCircle } from "react-icons/bi";
import { HiLogout } from "react-icons/hi";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LuMountainSnow } from "react-icons/lu";

function Header() {
  const [storage, setStorage] = useAtom(storageAtom);
  return (
    <nav className="bg-background  sticky top-0 w-full z-20  left-0 h-14 border-b border">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-2">
        <Link to="/dashboard" className="flex items-center">
          <span className="self-center text-lg font-semibold whitespace-nowrap text-primary flex justify-center items-center gap-2 ">
            <LuMountainSnow /> HeadTogether.
          </span>
        </Link>
        <div className="flex md:order-2  items-center">
          {!storage?.name ? (
            <Link to={"/login"}>
              <Button type="button" className=" text-xs p-0 px-2 ">
                Login
              </Button>
            </Link>
          ) : (
            <Button
              type="button"
              variant={"secondary"}
              className=" text-xs p-0 px-2 flex gap-1 font-bold"
              onClick={() => {
                localStorage.removeItem("h-store");
                window.location.reload();
                window.location.href = "/";
              }}
            >
              <BiUserCircle size={20} /> Logout <HiLogout />
            </Button>
          )}
          <SheetTrigger>
            <button
              data-collapse-toggle="navbar-sticky"
              type="button"
              className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-muted-foreground rounded-lg "
              aria-controls="navbar-sticky"
              aria-expanded="false"
            >
              <svg
                className="w-5 h-5"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 17 14"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M1 1h15M1 7h15M1 13h15"
                />
              </svg>
            </button>
          </SheetTrigger>
        </div>
      </div>
      <SheetContent side={"bottom"}>
        <div className="flex h-full w-full text-secondary font-semibold justify-center items-center  flex-col gap-5">
          <SheetClose asChild>
            <Link to={"/room"} className="text-primary">
              Joined Rooms
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link to={"/dashboard"} className="text-primary">
              Dashboard
            </Link>
          </SheetClose>
        </div>
      </SheetContent>
    </nav>
  );
}

export default Header;
