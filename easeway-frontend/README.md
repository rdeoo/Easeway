# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

### Backend and sign-in

Copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_API_URL` to the FastAPI
server, plus your Supabase project's API URL and **publishable** key. These
values ship with the app: never add the database password, secret/service-role
key, or Google Maps key. Restart Expo after changing environment variables.
On a physical device, use your computer's reachable LAN address for the API URL,
not `127.0.0.1`.

Sign-in and registration use Supabase Auth. If email confirmation is enabled,
confirm the email before signing in. The SDK persists sessions and refreshes
tokens; backend commute requests include the signed-in user's bearer token.

### Commutes and departure estimates

Search and select a Google Places suggestion for both locations. The backend
verifies each selection's address and coordinates before Save is enabled.
Editing a selected address invalidates the selection. Saving calls
`POST /commutes` once; the backend gets one `TRAFFIC_UNAWARE` route estimate,
saves `estimated_duration_seconds` with the commute in Supabase Postgres and
returns the saved record. Failures are displayed without inventing an estimate.
Loading/listing commutes reuses the saved duration, with no Google Routes call.

Departure time = arrival time - ceil(duration seconds / 60) - arrival buffer.
It is a baseline recommendation, not a live-traffic prediction. Old records
without a saved estimate display "Estimate unavailable".

The app shows only records returned by authenticated commute endpoints. No local
examples are injected. `src/constants/default-commutes.ts` remains a test fixture.
Lists use `/commutes?is_active=true`; details use `/commutes/{id}`. The backend
scopes these queries to the verified user, and changing users resets local state.

Registration requires a name, an email in a valid-looking format and a password
of at least 8 characters that is not all spaces. Login requires a valid-looking
email and a nonempty password; Supabase enforces the actual account policy.
Shared banners display local validation and returned authentication/API errors,
plus successful commute saves/deletions. Deletion requires a popup confirmation.

### Validation

```sh
npm test             # Node 22.18+; departure math and scheduling
npx tsc --noEmit
npm run lint
```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
