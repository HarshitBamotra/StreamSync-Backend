# StreamSync

Access frontend code at: https://github.com/HarshitBamotra/Stream-Sync-Frontend (Note: Frontend isn't fully developed yet)

Backend Deployment: https://streamsync-backend-54oq.onrender.com

Frontend Deployment: https://stream-sync-frontend.onrender.com

## Overview

This is the backend for a real-time streaming application that allows users to create rooms and share audio, video, and screen with other participants using WebRTC and Socket.IO.

1. Create and manage streaming rooms.
2. Share audio, video, and screen in real time.
3. Support for multiple participants per room.
4. REST API for room operations.
5. Socket.IO-based signaling for WebRTC connections.
---

## API Endpoints

**Create a room:** `POST: /api/rooms/create`
```bash
Sample Request
{
    "hostName":"Braincells"
}

Sample Response
{
    "success": true,
    "roomId": "fdd9c2f3-22ca-4e5a-addd-356eac45ce1f",
    "hostId": "4432d4cd-e5d0-4850-ae9d-75c1eed82233",
    "room": {
        "id": "fdd9c2f3-22ca-4e5a-addd-356eac45ce1f",
        "hostName": "Braincells",
        "participantCount": 1,
        "createdAt": "2025-06-20T16:34:51.482Z"
    }
}
```

**Join a room:** `POST /api/rooms/:roomId/join`
```bash
Sample Request
{
    "userName":"Brainy",
    "roomId":"fdd9c2f3-22ca-4e5a-addd-356eac45ce1f"
}

Sample Response
{
    "success": true,
    "userId": "148686d9-b3b6-43fe-a849-4e1955abe980",
    "room": {
        "id": "fdd9c2f3-22ca-4e5a-addd-356eac45ce1f",
        "hostName": "Braincells",
        "participantCount": 2,
        "participants": [
            {
                "id": "4432d4cd-e5d0-4850-ae9d-75c1eed82233",
                "name": "Braincells",
                "isHost": true,
                "joinedAt": "2025-06-20T16:34:51.480Z"
            },
            {
                "id": "148686d9-b3b6-43fe-a849-4e1955abe980",
                "name": "Brainy",
                "isHost": false,
                "joinedAt": "2025-06-20T16:35:40.702Z"
            }
        ]
    }
}
```


**Get info of a room:** `GET /api/rooms/:roomId`
```bash
Sample Response
{
    "id": "fdd9c2f3-22ca-4e5a-addd-356eac45ce1f",
    "hostName": "Braincells",
    "participantCount": 2,
    "participants": [
        {
            "id": "4432d4cd-e5d0-4850-ae9d-75c1eed82233",
            "name": "Braincells",
            "isHost": true,
            "joinedAt": "2025-06-20T16:34:51.480Z",
            "isAudioMuted": false,
            "isVideoEnabled": true,
            "isScreenSharing": false
        },
        {
            "id": "148686d9-b3b6-43fe-a849-4e1955abe980",
            "name": "Brainy",
            "isHost": false,
            "joinedAt": "2025-06-20T16:35:40.702Z",
            "isAudioMuted": false,
            "isVideoEnabled": true,
            "isScreenSharing": false
        }
    ],
    "createdAt": "2025-06-20T16:34:51.482Z",
    "isActive": true
}
```
**Delete a room:** `DELETE /api/rooms/:roomId`
```bash
Sample Request
{
    "userId":"4432d4cd-e5d0-4850-ae9d-75c1eed82233"
}

Sample Response
{
    "success": true,
    "message": "Room deleted successfully"
}
```
---
## Installation and Setup

### 1. Clone the repository:
```bash
git clone https://github.com/HarshitBamotra/StreamSync-Backend.git
```
### 2. Change directory
```bash
cd StreamSync-Backend
```
### 3. Install Dependencies
```bash
npm install
```

### 4. Set up environment variables

**Sample `.env` file**
```env
PORT = 3000
DB_URL = <YOUR MONGO DB URI>
```

### 5. Start the Application

```bash
npm start
```
---
## Web Socket Events
- `join-room`
- `offer`
- `answer`
- `ice-candidate`
- `toggle-audio`
- `toggle-video`
- `toggle-screen-share`
- `kick-participant`
- `chat-message`
- `leave-room`
- `disconnect`
