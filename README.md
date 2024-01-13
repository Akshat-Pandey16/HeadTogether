# HeadTogether
### Declaration : This Project has been completely made form scratch from the starting of the hackathon
Our project, HeadTogether is a travel companion app tailored for travelers. With our app, users can input their personal information and specify their travel intentions, whether it's exploring a new destination, sharing a cab ride, or enjoying a movie with someone. With HeadTogether, you can create and join exclusive "rooms" for specific purposes within a a specified radius, making your immediate location your password. Upon submission, our app will generate a virtual "room" based on these details, allowing users to define the room's size and set the range for visibility to others. This unique room concept is then made accessible to fellow app users within the specified range. They can explore these rooms, join discussions, and collaborate on travel plans, fostering connections and making solo adventures more engaging and social.  It's all about local synergy, where your neighbors, fellow commuters, or enthusiasts in your area can easily connect, share rides, play sports, or embark on shared activities, all by being in the right place at the right time. Whether you're seeking companionship, ride-sharing, or cultural exploration, our travel app has you covered. 

## Flow Diagram
![flow](images/flow.png)
## Database Diagram
![db](images/db.png)

## Tech Stack
### Frontend 
#### Capacitor (Ionic)
Capacitor allows you to convert your web app (built with React) into a native app, which is crucial for creating a mobile travel companion application. It bridges the gap between web and native development.

#### React
React is a popular and efficient JavaScript library for building user interfaces. It provides a responsive and interactive front end for your app.

#### TypeScript
TypeScript is a statically typed superset of JavaScript that helps catch type-related errors early in development, enhancing code quality and maintainability.

#### ReactQuery
ReactQuery is a library that simplifies data fetching and state management in React applications. It can improve the performance and maintainability of your app by handling data retrieval and caching.

#### ReactRouter
ReactRouter is used for managing the routing and navigation within your React application, ensuring a smooth and organized user experience.

#### Android SDK
This is essential for building Android applications. It provides the tools, libraries, and APIs necessary for developing Android apps.

### Backend 
#### FASTApi
FASTApi is a modern, fast (high-performance), web framework for building APIs with Python. It's suitable for creating the server-side logic and API endpoints for your app.
Before running the application, you need to install the required dependencies. You can do this using `pip`.

### Database
#### Firebase 
Firebase offers real-time database and authentication services, making it an excellent choice for a travel companion app that requires features like user authentication, real-time updates, and data storage. Used here for authentication

#### MySQL
MySQL is a relational database management system. It can be used to store structured data and ensure data consistency and integrity, which may be necessary for certain aspects of your application. Used here for user and room data management.

### Hosting
#### Render
Render is a cloud hosting platform that can host both frontend and backend applications. It offers scalability and ease of deployment, which is important for ensuring your app can handle varying levels of traffic. Used here to host the FASTApi app.


## Getting Started

Before running the application, you need to install the required dependencies. You can do this using `npm`.

```bash
npm install 
```

## Running the Application

You can run the React application using the following command:

```bash
npm run dev
```

This command starts the application on `http://localhost:8000`. You can access the API documentation at `http://localhost:8000/docs` or `http://localhost:8000/redoc`.

## Dependencies

- ReactJs: A modern, fast framework for building webapps.
- Capacitor: A plugin to convert react webapps to android/ios apps.
- Android SDK tools: To build android apps.

## Screenshots
| Landing Page                        | Creating Room                       | Join Room                                   |
| ----------------------------------- | ----------------------------------- | ------------------------------------------- |
| ![5](https://github.com/HashSociety/hackout_backend/blob/master/images/5.png?raw=true)                  | ![2](https://github.com/HashSociety/hackout_backend/blob/master/images/2.png?raw=true)                  | ![3](https://github.com/HashSociety/hackout_backend/blob/master/images/3.png?raw=true)                    |

| Room and its Details                | Overview                            |
| ----------------------------------- | ----------------------------------- | 
| ![4](https://github.com/HashSociety/hackout_backend/blob/master/images/4.png?raw=true)                  | ![1](https://github.com/HashSociety/hackout_backend/blob/master/images/1.png?raw=true)                  | 


## Contributors

[Akshat Pandey](https://github.com/Akshat-Pandey16) <br>
[Sanskar Dwivedi](https://github.com/Knighthawk-Leo) <br>
[Yash Sakre](https://github.com/Yash-Sakre) <br>
[Jayash Tripathi](https://github.com/JayashTripathy)<br>