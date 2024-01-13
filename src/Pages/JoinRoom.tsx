import { api } from "@/api";
import { storageAtom } from "@/store";
import { useAtom } from "jotai";
import React, { useState } from "react";

const JoinRoom = () => {
  const [storage, setStorage] = useAtom(storageAtom);

  const [input, setInput] = useState({
    room_id: "d04dc13f-0014-4803-ab76-db7712a4c65a",
    token: storage?.token || "",
  });

  const JoinRoomData = async () => {
    // console.log(input);
    try {
      const data = await api.room.join(input);
      if (data) {
        console.log(data);
      }
    } catch (e) {
      console.log("error");
    }
  };
  return (
    <div className="flex justify-center items-center h-screen">
      <button onClick={JoinRoomData}>Join</button>
    </div>
  );
};

export default JoinRoom;
