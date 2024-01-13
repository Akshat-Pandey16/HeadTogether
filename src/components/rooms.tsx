import { api } from "@/api";
import { storageAtom } from "@/store";
import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import React, { useEffect } from "react";
import { Button } from "./ui/button";
import { useHistory } from "react-router";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

function Rooms() {
  const [storage, setStorage] = useAtom(storageAtom);
  const history = useHistory();
  const roomsQuery = useQuery({
    queryKey: ["rooms"],
    queryFn: () => api.room.joinedRoom({ token: storage?.token || "" }),
  });

  const allRooms = roomsQuery.data;

  useEffect(() => {
    if(!storage?.name){
      history.push("/login")
    }
  },[])

  return (
    <div className="mt-16 h-screen ">
      <div className="flex flex-col mx-4 h-full ">
        <div className="text-xl font-semibold text-gray-500 pt-4 ">
          Joined Rooms
        </div>
        <br />
        <div className="flex  flex-col gap-4 pt-4  h-full overflow-auto">
          {allRooms &&
            allRooms.map((room: any, index: number) => (
              <Link to={`/room/${room.RoomID}`} className="w-full" key={index}>
                <Button
                  className="flex  justify-between p-5 border-2  rounded-lg w-full "
                  key={index}
                  variant={"secondary"}
                >
                  <div className="font-bold">{room.OwnerName}</div>
                  <div className="text-sm">{room.RoomPurpose}</div>
                </Button>
              </Link>
            ))}

          {roomsQuery.isLoading && (
            <div className=" flex gap-2 w-full flex-col ">
              <Skeleton className="h-2" />
              <Skeleton className="w-4/5 h-2" />
              <Skeleton className="w-3/5 h-2" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Rooms;
