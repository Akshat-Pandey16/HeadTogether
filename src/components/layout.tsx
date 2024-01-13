import React, { useEffect } from "react";
import Header from "./ui/header";
import { useAtom } from "jotai";
import { storageAtom } from "../store";
import { Toaster } from "./ui/toaster";
import { api } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { Storage } from "@/types/storage";

import { Sheet } from "@/components/ui/sheet";

function Layout(props: { children: React.ReactNode }) {
  const { children } = props;
  const [storage, setStorage] = useAtom(storageAtom);

  const getStorage = async () => {
    //@ts-ignore
    const storage = localStorage.getItem("h-store");
    if (storage) {
      setStorage(JSON.parse(storage));
    } else {
      setStorage({ token: "", name: "", email: "" });
    }
  };

  useEffect(() => {
    if (!storage) return;
    localStorage.setItem("h-store", JSON.stringify(storage));
  }, [storage]);

  useEffect(() => {
    
    getStorage();
  }, []);

  return (
    <Sheet>
      <Header />

      {children}
      <Toaster />
    </Sheet>
  );
}

export default Layout;
