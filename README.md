
 # `README.md`

````
# ShiftTrack

ShiftTrack is a small React Native + TypeScript mobile application built for the NexBrix Mobile Developer Assessment.

The application is designed around a simple staff shift-management workflow:

- Secure login and session persistence
- View the current week's shifts
- Create a shift
- Start an active shift
- Track an active shift with a live timer
- End an active shift
- Persist shift data across app restarts
- Handle loading, empty, and error states
- Retry failed API requests

---

## Tech Stack

- React Native
- TypeScript
- React Native CLI
- React Native Keychain
- AsyncStorage
- Mock API implemented locally in the application

---

## Requirements

Before running the application, make sure the development environment is configured for React Native.

Required:

- Node.js
- npm
- React Native CLI development environment
- Android Studio and Android SDK for Android development

For iOS development:

- macOS
- Xcode
- CocoaPods

---

# Getting Started

## 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <YOUR_PROJECT_FOLDER>
````

 ## 2\. Install dependencies

```
npm install
```

 ## 3\. iOS setup

 If running on iOS, install CocoaPods dependencies:

```
cd ios
pod install
cd ..
```

 ## 4\. Start Metro

```
npx react-native start
```

 ## 5\. Run Android

 In another terminal:

```
npx react-native run-android
```

 ## 6\. Run iOS

 On macOS:

```
npx react-native run-ios
```

---

 # Test Credentials

 The assessment-provided test credentials are:

```
Email: staff@shifttrack.test
Password: Password123
```

 These credentials are only used for the mock authentication flow.

---

 # Application Workflow

 The main workflow is:

```
Login
  ↓
View current week's shifts
  ↓
Create a shift
  ↓
Start an active shift
  ↓
Live timer
  ↓
Close/reopen the application
  ↓
Timer resumes from the persisted start time
  ↓
End the shift
```

---

 # Core Features

 ## 1\. Authentication

 The login screen accepts an email and password.

 The provided assessment credentials are accepted by the mock authentication API.

 Invalid credentials produce a clear error message instead of allowing the user to continue.

 After successful authentication, the returned token is stored using React Native Keychain.

 On application startup, the stored token is checked to determine whether the user already has an authenticated session.

 The user can also explicitly log out.

---

 ## 2\. Secure Session Storage

 Authentication state is separated from mock application data.

 The authentication token is stored using:

```
React Native Keychain
```

 This was chosen instead of storing the authentication token in AsyncStorage because authentication credentials should use secure device storage.

 The mock shift data is stored separately using AsyncStorage because it is only being used to simulate a backend for this assessment.

 The storage responsibilities are therefore:

```
Keychain
  └── Authentication token

AsyncStorage
  └── Mock shift data
```

 No production API keys, passwords, or other real secrets are included in the repository.

---

 # 3\. Current Week Shifts

 The shifts screen displays shifts belonging to the current Monday-to-Sunday week.

 The week start date is calculated dynamically.

 The mock API accepts the week start date:

```
GET /shifts?weekStart=YYYY-MM-DD
```

 The returned shifts include:

 - Date
- Start time
- End time
- Break duration
- Total duration

 Completed shifts calculate their total duration using the start and end timestamps while accounting for the configured break duration.

---

 # 4\. Create Shift

 Users can create a new shift from the shifts screen.

 The create-shift form validates the entered data before submitting.

 Validation includes:

 - Required fields
- Valid date/time values
- End time must be after start time
- Break duration must be valid
- Break duration cannot exceed the shift duration

 While a shift is being submitted, the submit action is disabled to prevent accidental double submission.

---

 # 5\. Active Shift

 An active shift is represented by:

```
{
  "endTime": null
}
```

 When the user selects **Start Shift**, a new shift is created through the mock:

```
POST /shifts
```

 with the current time as its `startTime` and:

```
endTime = null
```

 The application then treats this shift as the active shift.

 The user can end the active shift through:

```
PATCH /shifts/:id
```

 which sets the shift's `endTime` to the current time.

---

 # 6\. Live Timer

 The active shift timer is calculated from the persisted `startTime` rather than relying only on an incrementing counter.

 Conceptually:

```
elapsed time = current time - shift start time
```

 This approach is important because a JavaScript interval should not be treated as a reliable source of elapsed time when a mobile application is backgrounded or suspended.

 When the application becomes active again, the timer is recalculated using the stored start timestamp.

 This means the timer remains accurate when:

 - The application is backgrounded
- The application is reopened
- The application is restarted

 Example:

```
Start:
10:00:00

Application closed:
10:05:00

Application reopened:
10:10:00

Displayed elapsed time:
00:10:00
```

 The timer is therefore based on the actual timestamps rather than how many interval callbacks were executed.

---

 # 7\. Mock API

 No real backend is required for this assessment.

 The application contains a local mock API that represents the endpoints described in the assessment.

 The main API operations are:

```
POST /auth/login

GET /shifts?weekStart=YYYY-MM-DD

POST /shifts

PATCH /shifts/:id
```

 The mock API is kept separate from the UI so that replacing it with a real HTTP API later would not require rewriting the screens.

---

 # API Responsibilities

 ## Login

```
POST /auth/login
```

 Returns a mock authentication token and user information when valid credentials are provided.

---

 ## Get Shifts

```
GET /shifts?weekStart=YYYY-MM-DD
```

 Returns shifts belonging to the requested week.

---

 ## Create Shift

```
POST /shifts
```

 Creates and persists a new shift.

---

 ## Update Shift

```
PATCH /shifts/:id
```

 Updates an existing shift.

 The active-shift flow uses this endpoint to set `endTime` when the user ends the shift.

---

 # Error Handling

 The application handles several failure scenarios.

 ## Login Error

 Incorrect credentials display an authentication error to the user.

 ## API Error

 The mock API can intentionally simulate an error.

 This allows the application to demonstrate the required error state without relying on an external server being unavailable.

 The error flow is:

```
API request
   ↓
Mock API failure
   ↓
Error message
   ↓
Retry
   ↓
API request succeeds
```

 ## Retry

 When loading shifts fails, the user can retry the request rather than being forced to restart the application.

---

 # UI States

 The shifts screen handles the main request states:

```
Loading
   ↓
Success
   ↓
Empty
   ↓
Error
   ↓
Retry
```

 This prevents the application from displaying a blank screen while data is loading or when a request fails.

---

 # Project Structure

 The application separates screens, API logic, storage, types, and utility functions.

 A simplified structure is:

```
src/
├── api/
│   └── mockApi.ts
│
├── navigation/
│   └── AppNavigator.tsx
│
├── screens/
│   ├── LoginScreen.tsx
│   ├── ShiftsScreen.tsx
│   └── CreateShiftScreen.tsx
│
├── services/
│   └── authStorage.ts
│
├── types/
│   └── shift.ts
│
└── utils/
    └── time.ts
```

 The exact files may vary slightly as the project evolves.

---

 # Architecture

 The application uses a lightweight separation of responsibilities.

 ## Screens

 Screens are responsible primarily for:

 - Rendering UI
- Handling user interactions
- Managing screen-level state
- Calling the appropriate application/API functions

 ## Mock API

 The mock API contains the simulated backend operations.

 This keeps API behavior separate from UI components.

 For example:

```
Screen
  ↓
API function
  ↓
Mock persistence
```

 rather than putting storage and mock-server logic directly inside UI components.

 ## Authentication Storage

 Authentication persistence is isolated into a storage service.

 This makes it easier to replace or modify the authentication storage implementation later without changing the login screen.

 ## Utilities

 Time-related calculations are kept in utility functions rather than being duplicated across screens.

 This includes:

 - Duration calculation
- Elapsed active-shift time
- Current week calculation

---

 # Key Technical Decisions

 ## 1\. Keychain for authentication

 Authentication tokens are stored using React Native Keychain.

 The token is intentionally not stored in AsyncStorage.

 This provides a more appropriate storage mechanism for sensitive authentication state.

---

 ## 2\. Timestamp-based active timer

 The active timer is calculated from the shift's persisted `startTime`.

 I chose this instead of relying only on:

```
setInterval()
```

 because mobile applications can be backgrounded or suspended.

 A timestamp-based calculation allows the application to recalculate the correct elapsed time after returning to the foreground or restarting.

---

 ## 3\. Local mock API

 A local mock API was used because the assessment explicitly states that no real backend is required.

 Using a separate mock API layer also keeps the application architecture ready for replacing the mock implementation with real network requests later.

---

 ## 4\. AsyncStorage for mock data

 AsyncStorage is used to persist mock shift data between application launches.

 This gives the mock API behavior that is closer to a real backend from the user's perspective.

 It also allows the active shift to remain available after closing and reopening the application.

---

 ## 5\. Preventing duplicate submissions

 The create-shift operation tracks its submitting state.

 While the request is being processed, the submit button is disabled.

 This prevents repeated taps from creating duplicate shifts.

---

 # Validation

 The create-shift workflow validates user input before submitting.

 Examples include:

```
End time must be after start time
```

 and:

```
Break duration cannot exceed shift duration
```

 The validation is performed before calling the mock API.

---

 # Mobile UX

 The application includes:

 - Keyboard-aware login/form behavior
- Loading indicators
- Empty state messaging
- Error messages
- Retry action
- Disabled submit state while saving
- Clear active-shift state
- Persistent authentication
- Persistent active-shift information

 The UI intentionally remains relatively simple because the assessment prioritizes the core workflow and implementation quality over extensive visual polish.

---

 # Testing the Main Workflow

 A complete manual test can be performed using the following sequence:

 ## Step 1 — Login

 Use:

```
staff@shifttrack.test
Password123
```

 Verify that the shifts screen opens.

 ## Step 2 — Verify session persistence

 Close and reopen the application.

 Verify that the login screen is not displayed again.

 ## Step 3 — Create a shift

 Create a shift with a valid start/end time and break duration.

 Verify that it appears in the current week's list.

 ## Step 4 — Start an active shift

 Start a shift.

 Verify that:

 - The active shift appears
- The timer starts
- A second active shift cannot be started while one is active

 ## Step 5 — Close and reopen

 Close/reopen the application while the shift is active.

 Verify that the timer is recalculated from the original start time.

 ## Step 6 — End the shift

 End the active shift.

 Verify that the shift now has an end time and a calculated duration.

 ## Step 7 — Error state

 Trigger the mock API error.

 Verify that the error state is displayed.

 Select retry.

 Verify that the shifts load successfully.

---

 # Known Limitations

 This project intentionally uses a local mock API rather than a production backend.

 The following items were not implemented because they were optional or outside the core assessment scope:

 - Shift editing
- Shift deletion
- Automated unit/integration tests
- Advanced accessibility work
- Production backend integration
- Production authentication/authorization
- Production networking layer

 The implementation prioritizes the core workflow requested by the assessment.

---

 # What I Would Do Next

 If this application were being taken beyond the assessment, I would next consider:

 1. Replace the local mock API with a real HTTP API.
2. Add automated tests for time calculations, validation, authentication state, and API behavior.
3. Add integration tests for the complete shift workflow.
4. Improve accessibility, including labels, dynamic text sizing, and screen-reader support.
5. Add edit/delete functionality for shifts.
6. Add stronger network error handling and request cancellation.
7. Introduce a more formal state-management approach if application complexity grows.
8. Add production logging/crash reporting.
9. Add environment-specific configuration for development, staging, and production.
10. Add backend-side validation and authorization.

---

 # Assessment Scope

 The implementation focuses on the required core workflow within the assessment's stated time constraint.

 Optional features such as editing/deleting shifts, automated tests, accessibility improvements, and additional UI polish were intentionally not prioritized over the required functionality.

---

 # Author

 Manish Saini

 Built for the NexBrix Mobile Developer Assessment.

````