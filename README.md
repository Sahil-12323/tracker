To run JobTrackr AI in VS Code locally:

1. Open project
Download/open the project folder in VS Code.

Project structure:

app/
  backend/
  frontend/
2. Run MongoDB
If you have MongoDB installed locally, start it and use:

MONGO_URL=mongodb://localhost:27017
Or use MongoDB Atlas and paste your Atlas connection string.

3. Backend setup
In VS Code terminal:

cd backend
pip install -r requirements.txt
Create/update backend/.env:

MONGO_URL=mongodb://localhost:27017
DB_NAME=jobtrackr_ai
JWT_SECRET=your-random-long-secret
GROK_API_KEY=your-grok-key
GROK_MODEL=grok-4-latest
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
Run backend:

uvicorn server:app --host 0.0.0.0 --port 8001 --reload
Backend should run at:

http://localhost:8001
Test it:

http://localhost:8001/api/
4. Frontend setup
Open another VS Code terminal:

cd frontend
yarn install
Create/update frontend/.env:

EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
Run Expo:

npx expo start
Then:

Press w to run in browser
Scan QR with Expo Go on Android/iPhone
Press a for Android emulator
Press i for iOS simulator on Mac
5. Important for real phone testing
If you scan with Expo Go on your phone, localhost means your phone, not your computer.

Use your computer’s local IP instead:

EXPO_PUBLIC_BACKEND_URL=http://YOUR_COMPUTER_IP:8001
Example:

EXPO_PUBLIC_BACKEND_URL=http://192.168.1.25:8001
Backend must run with:

uvicorn server:app --host 0.0.0.0 --port 8001 --reload
6. Gmail redirect URI locally
For local browser testing, Google OAuth redirect URI would be:

http://localhost:8001/api/gmail/callback
For phone testing, Google may require a public HTTPS backend URL, so local Gmail OAuth can be tricky unless your backend is publicly reachable. For normal app features, local backend works fine.

