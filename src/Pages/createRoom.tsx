import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { storageAtom } from "@/store";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { useHistory } from "react-router";
import { Geolocation } from "@capacitor/geolocation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { api } from "@/api";
import { FaArrowRightLong } from "react-icons/fa6";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MdOutlineSportsVolleyball, MdTravelExplore } from "react-icons/md";
import { BiMoviePlay } from "react-icons/bi";
import { RiChat3Fill } from "react-icons/ri";

const presets = [
  {
    name: "Play",
    color: "#16a34a",
    className: "bg-green-500/70 border-green-500 border-[6px]",
    img: <MdOutlineSportsVolleyball />,
  },
  {
    name: "Movie",
    color: "#2563eb",
    className: "border-blue-500 bg-blue-500/70 border-[6px]",
    img: <BiMoviePlay />,
  },
  {
    name: "Travel",
    color: "#9333ea",
    className: "border-purple-500 bg-purple-500/70 border-[6px]",
    img: <MdTravelExplore />,
  },
  {
    name: "Chit Chat",
    color: "#ea580c",
    className: "border-orange-500 bg-orange-500/70 border-[6px]",
    img: <RiChat3Fill />,
  },
  {
    name: "Custom",
    color: "#ea580c",
    className: "border-orange-500 bg-orange-500/70 border-[6px]",
    img: <RiChat3Fill />,
  },
  {
    name: "Land mark ",
    color: "#ea580c",
    className: "border-orange-500 bg-orange-500/70 border-[6px]  ",
    img: <RiChat3Fill />,
  },
];

function CreateRoom() {
  const [storage, setStorage] = useAtom(storageAtom);
  const history = useHistory();
  const { toast } = useToast();
  const [input, setInput] = useState({
    OwnerName: storage?.name || "",
    RoomName: "",
    RoomPurpose: "",
    Latitude: "",
    Longitude: "",
    DistanceAllowed: 0,
    token: storage?.token || "",
  });
  const [purpose, setPurpose] = useState({
    heading: "",
    value: "",
  });

  const [roomId, setRoomId] = useState(null);
  const handleCreateRoom = async () => {
    try {
      const data = await api.room.create(input);
      if (data) {
        toast({
          title: "Room Initiated",
          // description: "Welcome!",
          className: cn(
            "bottom-5 right-0 flex fixed  md:top-4 md:right-4  text-blue-600 bg-muted border-blue-600 mx-3 w-[calc(100%-20px)]  "
          ),
        });
        setRoomId(data.RoomID);
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "All feilds are required",
        className: cn(
          "bottom-5 right-0 flex fixed  md:top-4 md:right-4  text-red-600 bg-muted border-red-600 mx-3 w-[calc(100%-20px)]  "
        ),
      });
    }
  };
  useEffect(() => {
    if (storage && !storage.name) {
      history.push("/login");
    }

    const getLocation = async () => {
      try {
        const coordinates = await Geolocation.getCurrentPosition();
        setInput((p) => ({
          ...p,
          Latitude: coordinates.coords.latitude.toString(),
          Longitude: coordinates.coords.longitude.toString(),
        }));
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to get location",
          className: cn(
            "bottom-5 right-0 flex fixed  md:top-4 md:right-4  text-red-600 bg-muted border-red-600 mx-3 w-[calc(100%-20px)]  "
          ),
        });
      }
    };

    if (input.Latitude === "" || input.Longitude === "") getLocation();
  }, []);

  const addPurposeMutation = useMutation({
    mutationFn: api.room.addPurpose,
    onSuccess: (data) => {
      toast({
        title: "Purpose Added Successfully",
        // description: "Welcome!",
        className: cn(
          "bottom-5 right-0 flex fixed  md:top-4 md:right-4  text-blue-600 bg-muted border-blue-600 mx-3 w-[calc(100%-20px)]  "
        ),
      });
      setPurpose({
        heading: "",
        value: "",
      });
    },
  });

  return (
    <div className="mt-20 w-full h-full overflow-auto ">
      {!roomId ? (
        <>
          <div className="text-3xl font-bold px-4">Create a room</div>
          {/* <Button variant={"secondary"} onClick={() => printCurrentPosition()}>
        Get ny location
      </Button> */}
          <br />
          <div className="  p-4 ">
            <Label className="text-md"> Room Name </Label>
            <Input
              placeholder="enter a name"
              value={input.RoomName}
              onChange={(e) =>
                setInput((p) => ({ ...p, RoomName: e.currentTarget.value }))
              }
              className="mt-3 text-lg"
            />
            <br />
            <Label className="text-md">Select a theme </Label>
            <RadioGroup
              defaultValue="option-one"
              onValueChange={(e: string) =>
                setInput((prev) => ({ ...prev, RoomPurpose: e }))
              }
            >
              <div className="gap-3 text-white  grid grid-cols-2 w-[calc(100%-16px)] mt-3 ">
                {presets.map((preset, i) => (
                  <div
                    key={i}
                    className={`relative border rounded-[30px] w-full  h-40 p-3 shadow-xl ${preset.className} overflow-hidden`}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={preset.name}
                        id={`option-${i}`}
                        className="border-[3px] border-white"
                      />
                      <Label
                        className={`text-2xl font-bold `}
                        style={{
                          color: preset.color,
                        }}
                        htmlFor={`option-${i}`}
                      >
                        {preset.name}
                      </Label>
                      <div className="absolute -bottom-5 -right-5 text-9xl opacity-50 ">
                        {preset.img}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>
            <br />
            <Label className="text-md"> Range for this room</Label>
            <div className=" flex gap-3 w-full">
              <Slider
                defaultValue={[input.DistanceAllowed]}
                max={100}
                step={2}
                onValueChange={(e) =>
                  setInput((p) => ({
                    ...p,
                    DistanceAllowed: e[0],
                  }))
                }
              />
              <div className="flex  whitespace-nowrap font-bold text-gray-600 ">{`${input.DistanceAllowed} KM`}</div>
            </div>
            <Button
              variant={"default"}
              className=" my-20 mt-10 w-full font-bold  text-1xl "
              onClick={async () => await handleCreateRoom()}
            >
              Create Room
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className=" w-full  flex flex-col  justify-center  items-center  h-[calc(100%-5rem)] ">
            <div className="flex-1 flex justify-center items-center">
              <Card className="w-[350px] ">
                <CardHeader>
                  <CardTitle>Add Some Purpose</CardTitle>
                  <CardDescription>
                    you can add multiple purpose to your room
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form>
                    <div className="grid w-full items-center gap-4">
                      <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="heading">Heading</Label>
                        <Input
                          id="heading"
                          placeholder="heading of your purpose"
                          value={purpose.heading}
                          onChange={(e) =>
                            setPurpose((p) => ({
                              ...p,
                              heading: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          placeholder="Type here ..."
                          value={purpose.value}
                          onChange={(e) =>
                            setPurpose((p) => ({
                              ...p,
                              value: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </form>
                </CardContent>
                <CardFooter
                  className=" cursor-pointer"
                  onClick={() =>
                    addPurposeMutation.mutate({
                      Room_ID: roomId,
                      Purpose_Description_Heading: purpose.value,
                      Purpose_Description_Value: purpose.heading,
                      token: storage?.token || "",
                    })
                  }
                >
                  <div className="bg-black text-white px-4 py-2 rounded-xl w-full text-center ">
                    Add
                  </div>
                </CardFooter>
              </Card>
            </div>
            <Link to={"/room"} className="flex p-2 w-full ">
              <Button className=" w-full flex gap-3">
                Done <FaArrowRightLong />{" "}
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default CreateRoom;
