from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
import pyrebase
from models import (
    SignupRequest,
    Token,
    RoomCreate,
    RoomPurposeModel,
    RoomResponseModel,
    RoomResponseModel_two,
    RoomResponseModel_three,
    UserResponseModel,
    PostChatModel,
    ChatData,
)
import aiomysql
import uuid
import math
from typing import List

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def index(request: Request):
    return {"message": "Hello"}


@app.get("/get")
async def index(request: Request):
    return {"message": "Hello"}


# const firebaseConfig = {
#   apiKey: "AIzaSyBtQKU950eUqsgAVtQw5aubRKXcmyc5g2E",
#   authDomain: "hashtogether.firebaseapp.com",
#   databaseURL: "https://hashtogether-default-rtdb.firebaseio.com",
#   projectId: "hashtogether",
#   storageBucket: "hashtogether.appspot.com",
#   messagingSenderId: "1079333558091",
#   appId: "1:1079333558091:web:6670b36cb755b756b4bace",
#   measurementId: "G-Z13R905TEE"
# };


# async def create_connection_pool():
#     pool = await aiomysql.create_pool(
#         host="sql.freedb.tech",
#         user="freedb_hashsociety",
#         password="PjbkVhfvM6U*rcp",
#         db="freedb_hashsociety",
#         autocommit=True,
#     )
#     return pool


# async def create_connection_pool():
#     pool = await aiomysql.create_pool(
#         host='127.0.0.1',
#         user='root',
#         password='4844',
#         db='headout',
#         autocommit=True
#     )
#     return pool


async def get_connection():
    return await app.state.pool.acquire()


async def release_connection(conn):
    await app.state.pool.release(conn)


# @app.on_event("startup")
# async def startup_event():
#     app.state.pool = await create_connection_pool()


# @app.on_event("shutdown")
# async def shutdown_event():
#     await app.state.pool.close()


config = {
    "apiKey": "AIzaSyBtQKU950eUqsgAVtQw5aubRKXcmyc5g2E",
    "authDomain": "hashtogether.firebaseapp.com",
    "projectId": "hashtogether",
    "storageBucket": "hashtogether.appspot.com",
    "messagingSenderId": "1079333558091",
    "appId": "1:1079333558091:web:6670b36cb755b756b4bace",
    "measurementId": "G-Z13R905TEE",
    "databaseURL": "https://hashtogether-default-rtdb.firebaseio.com",
}
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")
firebase = pyrebase.initialize_app(config)
auth = firebase.auth()


@app.post("/signup", tags=["Auth"])
async def signup(request: SignupRequest):
    try:
        user = auth.create_user_with_email_and_password(request.email, request.password)
        async with await get_connection() as conn:
            async with conn.cursor() as cursor:
                sql = "INSERT INTO User (EmailId, Name, LastName, Gender, Age) VALUES (%s, %s, %s, %s, %s)"
                values = (
                    request.email,
                    request.name,
                    request.last_name,
                    request.gender,
                    request.age,
                )
                await cursor.execute(sql, values)

        return {"message": "Signup successful", "user": f"{user['email']}"}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail="Signup failed")


def authenticate_user(username: str, password: str):
    try:
        response = auth.sign_in_with_email_and_password(username, password)

        access_token = response["idToken"]

        return {"access_token": access_token, "token_type": "bearer"}
    # except client.exceptions.NotAuthorizedException:
    #     raise Exception("Invalid credentials")
    # except client.exceptions.UserNotFoundException:
    #     raise Exception("User not found")
    except Exception as e:
        raise Exception(str(e))


@app.post("/login", response_model=Token, tags=["Auth"])
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    return authenticate_user(form_data.username, form_data.password)


@app.get("/get_user_info", tags=["Auth"])
async def get_user_info(token: str = Depends(oauth2_scheme)):
    info = auth.get_account_info(token)
    email = info["users"][0]["email"]

    # Use the email to fetch user information from the User table
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            # Define the SQL query to retrieve user information based on the email
            sql = "SELECT * FROM User WHERE EmailId = %s"

            # Execute the SQL query with the email as a parameter
            await cursor.execute(sql, (email,))

            # Fetch the result
            user_info = await cursor.fetchone()

    # Check if user information was found
    if user_info:
        # Convert the result to a dictionary for response
        user_info_dict = {
            "Userid": user_info[0],
            "EmailId": user_info[1],
            "Name": user_info[2],
            "LastName": user_info[3],
            "Gender": user_info[4],
            "Age": user_info[5],
        }
        return user_info_dict
    else:
        raise HTTPException(status_code=404, detail="User not found")


@app.post("/create_room", tags=["Rooms"])
async def create_room(room_data: RoomCreate, token: str = Depends(oauth2_scheme)):
    info = auth.get_account_info(token)
    email = info["users"][0]["email"]

    # Use the email to fetch the User's UserID from the User table
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "SELECT UserID FROM User WHERE EmailId = %s"
            await cursor.execute(sql, (email,))
            user_info = await cursor.fetchone()

    if not user_info:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        room_id = str(uuid.uuid4())

        # Insert the data into the Room table
        query = """
            INSERT INTO Room (RoomID, UserID, OwnerName, RoomPurpose, Latitude, Longitude, DistanceAllowed)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        values = (
            room_id,
            user_info[0],
            room_data.OwnerName,
            room_data.RoomPurpose,
            room_data.Latitude,
            room_data.Longitude,
            room_data.DistanceAllowed,
        )

        query_participant = """
            INSERT INTO RoomParticipants (Room_ID, ParticipantID, IsAdmin) VALUES (%s, %s, %s)
        """

        value_participant = (room_id, user_info, 1)

        async with await get_connection() as conn:
            async with conn.cursor() as cursor:
                print(0)
                await cursor.execute(query, values)
                print(1)

            async with conn.cursor() as cursor:
                print(0)
                await cursor.execute(query_participant, value_participant)
                print(1)

            conn.commit()
    except Exception as e:
        print(e)
        raise HTTPException(
            status_code=500, detail="Error inserting data into the database"
        )

    return {"message": "Room created successfully", "RoomID": room_id}


# Endpoint to add a purpose description to a room
@app.post("/post_add_purpose", response_model=RoomPurposeModel, tags=["Rooms"])
async def post_add_purpose(
    purpose_data: RoomPurposeModel, token: str = Depends(oauth2_scheme)
):
    # Get the user's email from the authentication token
    info = auth.get_account_info(token)
    email = info["users"][0]["email"]

    # Use the email to fetch the User's UserID from the User table
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "SELECT UserID FROM User WHERE EmailId = %s"
            await cursor.execute(sql, (email,))
            user_info = await cursor.fetchone()

    if not user_info:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if the RoomID exists in the Room table
    if not room_exists(purpose_data.Room_ID):
        raise HTTPException(status_code=404, detail="Room not found")

    # Add the purpose description data to the RoomPurpose table
    await insert_purpose_description(
        purpose_data.Room_ID,
        purpose_data.Purpose_Description_Heading,
        purpose_data.Purpose_Description_Value,
    )

    return purpose_data


# Check if the room exists in the Room table (replace with your database query)
async def room_exists(room_id):
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "SELECT RoomID FROM Room WHERE RoomID = %s"
            await cursor.execute(sql, (room_id,))
            return cursor.fetchone() is not None


# Insert purpose description into the RoomPurpose table
async def insert_purpose_description(room_id, heading, value):
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "INSERT INTO RoomPurpose (Room_ID, Purpose_Description_Heading, Purpose_Description_Value) VALUES (%s, %s, %s)"
            await cursor.execute(sql, (room_id, heading, value))


@app.get("/get_room/{room_id}", tags=["Rooms"], response_model=RoomResponseModel)
async def get_room(room_id: str, token: str = Depends(oauth2_scheme)):
    info = auth.get_account_info(token)
    email = info["users"][0]["email"]

    # Use the email to fetch the User's UserID from the User table
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "SELECT UserID FROM User WHERE EmailId = %s"
            await cursor.execute(sql, (email,))
            user_info = await cursor.fetchone()

    if not user_info:
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch the room data from the Room table
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "SELECT * FROM Room WHERE RoomID = %s"
            await cursor.execute(sql, (room_id))
            room_data = await cursor.fetchone()

    if not room_data:
        raise HTTPException(status_code=404, detail="Room not found")

    # Fetch all purpose descriptions for the room from the RoomPurpose table
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "SELECT Purpose_Description_Heading, Purpose_Description_Value FROM RoomPurpose WHERE Room_ID = %s"
            await cursor.execute(sql, (room_id))
            purpose_descriptions = await cursor.fetchall()
            print(purpose_descriptions)

    return RoomResponseModel(
        **{
            "RoomID": room_data[0],
            "UserID": room_data[1],
            "OwnerName": room_data[2],
            "RoomPurpose": room_data[3],
            "Latitude": room_data[4],
            "Longitude": room_data[5],
            "DistanceAllowed": room_data[6],
            "PurposeDescriptions": [
                {"Heading": desc[0], "Value": desc[1]} for desc in purpose_descriptions
            ],
        }
    )


@app.get(
    "/search_nearby_rooms", tags=["Rooms"], response_model=List[RoomResponseModel_two]
)
async def search_nearby_rooms(
    user_latitude: float, user_longitude: float, token: str = Depends(oauth2_scheme)
):
    info = auth.get_account_info(token)
    email = info["users"][0]["email"]

    # Use the email to fetch the User's UserID from the User table
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "SELECT UserID FROM User WHERE EmailId = %s"
            await cursor.execute(sql, (email,))
            user_info = await cursor.fetchone()

    if not user_info:
        raise HTTPException(status_code=404, detail="User not found")

    # async with await get_connection() as conn:
    #     async with conn.cursor() as cursor:
    #         sql = "SELECT * FROM Room WHERE RoomID = %s"
    #         await cursor.execute(sql, (room_id))
    #         room_data = await cursor.fetchone()
    # Fetch all rooms from the database
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "SELECT * FROM Room"
            await cursor.execute(sql)
            rooms_data = await cursor.fetchall()

    nearby_rooms = []

    for room_data in rooms_data:
        # Calculate the distance between the user and the room using Haversine formula
        room_latitude = room_data[4]
        room_longitude = room_data[5]
        distance = haversine(
            user_latitude, user_longitude, room_latitude, room_longitude
        )

        # Define a maximum distance threshold, e.g., 10 kilometers
        max_distance = room_data[6]  # Adjust this as needed

        if distance <= max_distance:
            nearby_rooms.append(
                RoomResponseModel_two(
                    **{
                        "RoomID": room_data[0],
                        "UserID": room_data[1],
                        "OwnerName": room_data[2],
                        "RoomPurpose": room_data[3],
                        "Latitude": room_data[4],
                        "Longitude": room_data[5],
                        "DistanceAllowed": room_data[6],
                        "DistanceFromUser": distance,
                    }
                )
            )

    return nearby_rooms


def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    lat1 = math.radians(lat1)
    lon1 = math.radians(lon1)
    lat2 = math.radians(lat2)
    lon2 = math.radians(lon2)

    dlon = lon2 - lon1
    dlat = lat2 - lat1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    distance = R * c

    return distance


@app.post("/join_room/{room_id}", tags=["Rooms"])
async def join_room(room_id: str, token: str = Depends(oauth2_scheme)):
    info = auth.get_account_info(token)
    email = info["users"][0]["email"]

    # Use the email to fetch the User's UserID from the User table
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "SELECT UserID FROM User WHERE EmailId = %s"
            await cursor.execute(sql, (email,))
            user_info = await cursor.fetchone()

    if not user_info:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if the room exists
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "SELECT * FROM Room WHERE RoomID = %s"
            await cursor.execute(sql, (room_id,))
            room_data = await cursor.fetchone()

    if not room_data:
        raise HTTPException(status_code=404, detail="Room not found")

    # Check if the user is already a member of the room
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "SELECT * FROM RoomParticipants WHERE Room_ID = %s AND ParticipantID = %s"
            await cursor.execute(sql, (room_id, user_info[0]))
            existing_member = await cursor.fetchone()

    if existing_member:
        raise HTTPException(
            status_code=400, detail="User is already a member of the room"
        )

    # Add the user as a member to the room with is_admin set to 0
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "INSERT INTO RoomParticipants (Room_ID, ParticipantID, IsAdmin) VALUES (%s, %s, 0)"
            await cursor.execute(sql, (room_id, user_info[0]))

    return {"message": "User joined the room successfully"}


@app.get(
    "/room_members/{room_id}", tags=["Rooms"], response_model=List[UserResponseModel]
)
async def get_room_members(room_id: str, token: str = Depends(oauth2_scheme)):
    info = auth.get_account_info(token)
    email = info["users"][0]["email"]

    # Use the email to fetch the User's UserID from the User table
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "SELECT UserID FROM User WHERE EmailId = %s"
            await cursor.execute(sql, (email,))
            user_info = await cursor.fetchone()

    if not user_info:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if the user is a member of the room
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "SELECT * FROM RoomParticipants WHERE Room_ID = %s AND ParticipantID = %s"
            await cursor.execute(sql, (room_id, user_info[0]))
            is_member = await cursor.fetchone()

    if not is_member:
        raise HTTPException(status_code=403, detail="User is not a member of the room")

    # Fetch all members of the room by joining the RoomParticipants and User tables
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "SELECT u.UserID, u.Name AS Name, u.Gender, u.Age FROM User u INNER JOIN RoomParticipants rm ON u.UserID = rm.ParticipantID WHERE rm.Room_ID = %s"
            await cursor.execute(sql, (room_id,))
            room_members = await cursor.fetchall()

    # Convert the SQL result to a list of dictionaries with the expected keys
    room_members_data = [
        {
            "UserID": user[0],
            "Name": user[1],  # Alias the 'Name' column as 'Name'
            "Gender": user[2],
            "Age": user[3],
        }
        for user in room_members
    ]

    return room_members_data


@app.get("/joined_rooms/", tags=["Rooms"], response_model=List[RoomResponseModel_three])
async def get_joined_rooms(token: str = Depends(oauth2_scheme)):
    info = auth.get_account_info(token)
    email = info["users"][0]["email"]

    # Use the email to fetch the User's UserID from the User table
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "SELECT UserID FROM User WHERE EmailId = %s"
            await cursor.execute(sql, (email,))
            user_info = await cursor.fetchone()

    if not user_info:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = user_info[0]

    # Use the UserID to fetch the rooms the user is joined in from the RoomMember table
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = (
                "SELECT Room_ID, IsAdmin FROM RoomParticipants WHERE ParticipantID = %s"
            )
            await cursor.execute(sql, (user_id,))
            room_info = await cursor.fetchall()

    if not room_info:
        raise HTTPException(status_code=404, detail="User is not joined in any room")

    # Use the RoomIDs and IsAdmin information to fetch the room details from the Room table
    joined_rooms = []
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            for room_id, is_admin in room_info:
                sql = "SELECT * FROM Room WHERE RoomID = %s"
                await cursor.execute(sql, (room_id,))
                room_data = await cursor.fetchone()
                joined_rooms.append(
                    RoomResponseModel_three(
                        **{
                            "RoomID": room_data[0],
                            "UserID": room_data[1],
                            "OwnerName": room_data[2],
                            "RoomPurpose": room_data[3],
                            "IsAdmin": is_admin,  # Include the IsAdmin information
                        }
                    )
                )
    return joined_rooms


# Endpoint to post a chat message to a room
@app.post("/post_chat", tags=["Chats"])
async def post_chat(chat_data: PostChatModel, token: str = Depends(oauth2_scheme)):
    info = auth.get_account_info(token)
    email = info["users"][0]["email"]

    # Use the email to fetch the User's UserID from the User table
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "SELECT UserID FROM User WHERE EmailId = %s"
            await cursor.execute(sql, (email,))
            user_info = await cursor.fetchone()

    if not user_info:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = user_info[0]

    # Check if the user is a participant in the specified room
    room_id = chat_data.RoomID
    if not is_user_joined_room(user_id, room_id):
        raise HTTPException(
            status_code=404, detail="User is not a participant in this room"
        )

    # Insert the chat message into the Chats table
    await insert_chat(room_id, user_id, chat_data.Chat)

    return {"message": "Chat message posted successfully"}


# Function to check if the user is a participant in the room
async def is_user_joined_room(user_id, room_id):
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "SELECT Room_ID FROM RoomParticipants WHERE ParticipantID = %s AND Room_ID = %s"
            await cursor.execute(sql, (user_id, room_id))
            return cursor.fetchone() is not None


# Function to insert a chat message into the Chats table
async def insert_chat(room_id, user_id, chat):
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "INSERT INTO Chats (RoomID, UserID, Chat) VALUES (%s, %s, %s)"
            await cursor.execute(sql, (room_id, user_id, chat))


# Endpoint to get chats for a specific room ordered by timestamp
@app.get("/get_chats/{room_id}", tags=["Chats"], response_model=List[ChatData])
async def get_chats(room_id: str, token: str = Depends(oauth2_scheme)):
    info = auth.get_account_info(token)
    email = info["users"][0]["email"]

    # Use the email to fetch the User's UserID from the User table
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = "SELECT UserID FROM User WHERE EmailId = %s"
            await cursor.execute(sql, (email,))
            user_info = await cursor.fetchone()

    if not user_info:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = user_info[0]

    # Check if the user is a participant in the specified room
    if not await is_user_joined_room(user_id, room_id):
        raise HTTPException(
            status_code=404, detail="User is not a participant in this room"
        )

    # Fetch chat messages for the specified room ordered by timestamp
    chat_data = await get_chat_data(room_id)

    return chat_data


# Function to fetch chat data for a specific room ordered by timestamp
async def get_chat_data(room_id):
    async with await get_connection() as conn:
        async with conn.cursor() as cursor:
            sql = (
                "SELECT User.Name, Chats.Chat, Chats.TimeStamp FROM Chats "
                "INNER JOIN User ON Chats.UserID = User.UserID "
                "WHERE Chats.RoomID = %s "
                "ORDER BY Chats.TimeStamp DESC"
            )
            await cursor.execute(sql, (room_id,))
            chat_data = await cursor.fetchall()

    # Convert the chat data to the ChatData model
    return [
        ChatData(Username=row[0], Message=row[1], Timestamp=row[2]) for row in chat_data
    ]
