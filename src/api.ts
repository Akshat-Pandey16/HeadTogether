const port =
  "https://5471-2405-201-3005-e835-24da-8025-9bfd-b78f.ngrok-free.app";

export const api = {
  user: {
    login: async (props: { username: string; password: string }) => {
      const { username, password } = props;
      try {
        if (!username || !password) return;
        const requestBody: string = `username=${encodeURIComponent(
          username
        )}&password=${encodeURIComponent(password)}`;

        const response = await fetch(port + "/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "ngrok-skip-browser-warning": "true",
          },
          body: requestBody,
        });

        const data = await response.json();
        return data;
      } catch (e) {
        console.log(e);
        throw new Error("Error occurred during login request.");
      }
    },
    signup: async (props: {
      email: string;
      password: string;
      name: string;
      last_name: string;
      gender: string;
      age: string;
    }) => {
      const { email, password, name, last_name, gender, age } = props;

      try {
        if (!email || !password || !name || !last_name || !gender || !age) {
          throw new Error("All fields are required.");
        }

        const requestBody = JSON.stringify({
          email: email,
          password: password,
          name: name,
          last_name: last_name,
          gender: gender,
          age: age,
        });

        const response = await fetch(port + "/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          body: requestBody,
        });

        const data = await response.json();
        return data;
      } catch (e) {
        console.log(e);
        throw new Error("Error occurred during registration request.");
      }
    },
    getUser: async (props: { token: string }) => {
      // const storage: Storage = await JSON.parse(
      //   localStorage.getItem("h-store") || "{}"
      // );
      // const token = storage.token;
      const token = props.token;

      if (token) {
        const res = await fetch(port + "/get_user_info", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
        });

        return res.json();
      } else {
        throw new Error("Token is not available.");
      }
    },
  },

  room: {
    create: async (props: {
      OwnerName: string;
      RoomName: string;
      Latitude: string;
      Longitude: string;
      DistanceAllowed: number;
      RoomPurpose: string;
      token: string;
    }) => {
      const {
        OwnerName,
        RoomPurpose,
        RoomName,
        Latitude,
        Longitude,
        DistanceAllowed,
        token,
      } = props;

      try {
        if (
          !OwnerName ||
          !RoomName ||
          !Latitude ||
          !Longitude ||
          !DistanceAllowed
        ) {
          throw new Error("All fields are required.");
        }

        const requestBody = JSON.stringify({
          OwnerName: RoomName,
          RoomPurpose: RoomPurpose,
          Latitude: Latitude,
          Longitude: Longitude,
          DistanceAllowed: DistanceAllowed,
        });

        const response = await fetch(port + "/create_room", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: requestBody,
        });

        const data = await response.json();
        return data;
      } catch (e) {
        console.log(e);
        throw new Error("Error occurred during registration request.");
      }
    },
    addPurpose: async (props: {
      Room_ID: string;
      Purpose_Description_Heading: string;
      Purpose_Description_Value: string;
      token: string;
    }) => {
      const {
        Room_ID,
        Purpose_Description_Heading,
        Purpose_Description_Value,
        token,
      } = props;

      try {
        if (
          !Room_ID ||
          !Purpose_Description_Heading ||
          !Purpose_Description_Value
        ) {
          throw new Error("All fields are required.");
        }

        const requestBody = JSON.stringify({
          Room_ID: Room_ID,
          Purpose_Description_Heading: Purpose_Description_Heading,
          Purpose_Description_Value: Purpose_Description_Value,
        });

        const response = await fetch(port + "/post_add_purpose", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
          body: requestBody,
        });

        if (response.status === 200) {
          const data = await response.json();
          return data;
        } else if (response.status === 422) {
          const errorData = await response.json();
          throw new Error("Validation Error: " + JSON.stringify(errorData));
        } else {
          throw new Error("Error occurred during the request.");
        }
      } catch (e) {
        console.log(e);
        throw new Error("Error occurred during the request.");
      }
    },
    join: async (props: { room_id: string; token: string }) => {
      const { room_id, token } = props;

      try {
        if (!room_id) {
          throw new Error("All fields are required.");
        }

        const requestBody = JSON.stringify({
          room_id: room_id,
        });

        const response = await fetch(port + `/join_room/${room_id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: requestBody,
        });

        const data = await response.json();
        return data;
      } catch (e) {
        console.log(e);
        throw new Error("Error occurred during registration request.");
      }
    },
    joinedRoom: async (props: { token: string }) => {
      try {
        const token = props.token;
        const response = await fetch(port + `/joined_rooms/`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
        });

        return response.json();
      } catch (e) {
        console.log(e);
        throw new Error("Error occurred during registration request.");
      }
    },
    getRoom: async (props: { room_id: string; token: string }) => {
      const { room_id, token } = props;
      try {
        if (!room_id) {
          throw new Error("Room ID is required.");
        }

        const response = await fetch(`${port}/get_room/${room_id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
        });

        if (response.status === 200) {
          const data = await response.json();
          return data;
        } else if (response.status === 422) {
          const errorData = await response.json();
          throw new Error("Validation Error: " + JSON.stringify(errorData));
        } else {
          throw new Error("Error occurred during the request.");
        }
      } catch (e) {
        throw new Error("Error occurred during the request.");
      }
    },
    getRoomMembers: async (props: { room_id: string; token: string }) => {
      const { room_id, token } = props;
      try {
        if (!room_id) {
          throw new Error("Room ID is required.");
        }

        const response = await fetch(`${port}/room_members/${room_id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
        });

        if (response.status === 200) {
          const data = await response.json();
          return data;
        } else if (response.status === 422) {
          const errorData = await response.json();
          throw new Error("Validation Error: " + JSON.stringify(errorData));
        } else {
          throw new Error("Error occurred during the request.");
        }
      } catch (e) {
        console.log(e);
        throw Error("Error occurred during the request.");
      }
    },
    search: async (props: {
      user_latitude: number;
      user_longitude: number;
      token: string;
    }) => {
      const { user_latitude, user_longitude, token } = props;
    
      try {
        const response = await fetch(
          `${port}/search_nearby_rooms?user_latitude=${user_latitude}&user_longitude=${user_longitude}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              "ngrok-skip-browser-warning": "true",
            },
          }
        );
    
        if (response.status === 200) {
          const data = await response.json();
          return data;
        } else if (response.status === 422) {
          const errorData = await response.json();
          throw new Error("Validation Error: " + JSON.stringify(errorData));
        } else {
          throw new Error("Error occurred during the request.");
        }
      } catch (e) {
        console.log(e);
        throw new Error("Error occurred during the request.");
      }
    },
    
    
    getChats: async (props: { room_id: string; token: string }) => {
      const { room_id, token } = props;

      try {
        if (!room_id) {
          throw new Error("Room ID is required.");
        }

        const response = await fetch(`${port}/get_chats/${room_id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
        });

        if (response.status === 200) {
          const data = await response.json();
          return data;
        } else if (response.status === 422) {
          const errorData = await response.json();
          throw new Error("Validation Error: " + JSON.stringify(errorData));
        } else {
          throw new Error("Error occurred during the request.");
        }
      } catch (e) {
        console.log(e);
        throw new Error("Error occurred during the request.");
      }
    },
    postChat: async (props: {
      RoomID: string;
      Chat: string;
      token: string;
    }) => {
      const { RoomID, Chat, token } = props;

      try {
        if (!RoomID || !Chat) {
          throw new Error("RoomID and Chat are required.");
        }

        const requestBody = JSON.stringify({
          RoomID: RoomID,
          Chat: Chat,
        });

        const response = await fetch(`${port}/post_chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
          body: requestBody,
        });

        if (response.status === 200) {
          const data = await response.json();
          return data;
        } else if (response.status === 422) {
          const errorData = await response.json();
          throw new Error("Validation Error: " + JSON.stringify(errorData));
        } else {
          throw new Error("Error occurred during the request.");
        }
      } catch (e) {
        console.log(e);
        throw new Error("Error occurred during the request.");
      }
    },
  },
};
