import * as Keychain from "react-native-keychain";

const SERVICE_NAME = "ShiftTrack";

export async function saveToken(token: string) {
  await Keychain.setGenericPassword("auth", token, {
    service: SERVICE_NAME,
  });
}

export async function getToken(): Promise<string | null> {
  const credentials = await Keychain.getGenericPassword({
    service: SERVICE_NAME,
  });

  if (!credentials) {
    return null;
  }

  return credentials.password;
}

export async function removeToken() {
  await Keychain.resetGenericPassword({
    service: SERVICE_NAME,
  });
}
