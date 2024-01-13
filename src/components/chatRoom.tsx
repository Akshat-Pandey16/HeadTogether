import { api } from "@/api";
import { storageAtom } from "@/store";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import React, { useEffect, useState } from "react";
import { useHistory } from "react-router";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

function ChatRoom() {
  const history = useHistory();
  const [storage, setStorage] = useAtom(storageAtom);
  const path = history.location.pathname.split("/")[2];
  const [input, setInput] = useState("");
  const roomQuery = useQuery({
    queryKey: ["room", path],
    queryFn: () =>
      api.room.getRoom({ room_id: path, token: storage?.token || "" }),
  });
  const chatQuery = useQuery({
    queryKey: ["chat", path],
    queryFn: () =>
      api.room.getChats({ room_id: path, token: storage?.token || "" }),
  });

  const chatMutation = useMutation({
    mutationKey: ["chat", path],
    mutationFn: () =>
      api.room.postChat({
        RoomID: path,
        token: storage?.token || "",
        Chat: input,
      }),
    onSuccess: (data) => {
      setInput("");
      chatQuery.refetch();
    },
  });

  const [isDelayOver, setDelayOver] = useState(false);

  useEffect(() => {
    const delayTimer = setTimeout(() => {
      setDelayOver(true);
    }, 3000); // 3 seconds

    return () => clearTimeout(delayTimer);
  }, []);

  const roomMembers = useQuery({
    queryKey: ["room-members", path],
    queryFn: () =>
      api.room.getRoomMembers({ room_id: path, token: storage?.token || "" }),
    enabled: !roomQuery.isLoading && isDelayOver,
  });

  const roomData = roomQuery.data;
  const membersData = roomMembers.data;
  const allChats = chatQuery.data;

  console.log(allChats);

  return (
    <AlertDialog>
      {roomData && (
        <>
          <div className="h-screen pt-20 mx-4">
            <div className="flex flex-col  h-full ">
              <div className="font-bold text-3xl flex justify-between ">
                {roomData.OwnerName}{" "}
                <Badge
                  variant="default"
                  className="text-xs font-normal px-4 py-1 leading-1 rounded-full h-6 "
                >
                  {roomData.RoomPurpose}
                </Badge>
              </div>
              <div className="flex justify-between ">
                <AlertDialogTrigger className="text-left text-sx text-gray-500 underline">
                  Click here to see more
                </AlertDialogTrigger>
                <div className="italic text-xs ">
                  under {roomData.DistanceAllowed} KM's
                </div>
              </div>
              {membersData && (
                <div className="flex items-center gap-2 ">
                  <div className="text-xs whitespace-nowrap ">All members</div>

                  <div className="w-full  my-5 overflow-auto flex gap-2">
                    {membersData.map((member: any, index: number) => (
                      <Badge
                        variant="default"
                        className="text-xs font-normal px-4 py-1 leading-1 rounded-full h-6 "
                      >
                        {member.Name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* div for listing all the messages */}
              <div className="flex-1 flex flex-col gap-2  mt-5">
                {allChats &&
                  allChats.map((chat: any, index: number) => (
                    <div className="w-full flex flex-col" key={index}>
                      <div
                        className={` p-2 max-w-[300px] rounded-xl  ${
                          chat.Username === storage?.name
                            ? "self-end text-right bg-blue-500 text-white"
                            : "bg-secondary"
                        }`}
                      >
                        <div className="font-bold">{chat.Username}</div>
                        <div>{chat.Message}</div>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="flex gap-2 mb-6">
                <Input
                  placeholder="type your message here ..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <Button className="" onClick={() => chatMutation.mutate()}>Send</Button>
              </div>
            </div>
          </div>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogDescription>
                <div className="text-left font-bold text-xl">
                  Purpose of this room
                </div>
                {roomData.PurposeDescriptions?.map(
                  (item: any, index: number) => (
                    <div className="pt-5 flex text-lg gap-2">
                      <div>{index + 1}.</div>
                      <div
                        className="flex justify-between  flex-col  font-normal"
                        key={index}
                      >
                        <div className="text-left text-lg font-bold text-primary ">
                          {item.Heading}
                        </div>
                        <div className="text-left text-sm">{item.Value}</div>
                      </div>
                    </div>
                  )
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </>
      )}
    </AlertDialog>
  );
}

export default ChatRoom;

// {
//     RoomID: '543755c7-ed8d-4ca2-a837-bcf5eb43ee38',
//     UserID: 2,
//     OwnerName: 'test',
//     RoomPurpose: 'Play',
//     Latitude: 21.1915732,
//     Longitude: 81.3069208,
//     DistanceAllowed: 8,
//     PurposeDescriptions: [ { Heading: 'new', Value: 'new' } ]
//   }

// [ { UserID: 2, Name: 'jayash', Gender: 'Male', Age: 21 }
