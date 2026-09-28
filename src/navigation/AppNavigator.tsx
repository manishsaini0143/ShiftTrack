import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import LoginScreen from "../screens/LoginScreen";
import ShiftsScreen from "../screens/ShiftsScreen";
import {
    getToken,
    removeToken,
  } from "../services/authStorage";
import CreateShiftScreen from "../screens/CreateShiftScreen";
  

type Screen = "login" | "shifts" | "createShift";

export default function AppNavigator() {
  const [screen, setScreen] = useState<Screen | null>(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  async function checkAuthentication() {
    try {
      const token = await getToken();

      setScreen(token ? "shifts" : "login");
    } catch {
      setScreen("login");
    }
  }

  if (screen === null) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (screen === "login") {
    return (
      <LoginScreen
        onLogin={() => setScreen("shifts")}
      />
    );
  }

  if (screen === "createShift") {
    return (
      <CreateShiftScreen
        onCreated={() => setScreen("shifts")}
        onCancel={() => setScreen("shifts")}
      />
    );
  }

  return (
    <ShiftsScreen
      onCreateShift={() => setScreen("createShift")}
      onLogout={async () => {
        await removeToken();
        setScreen("login");
      }}
    />
  );
  
}
