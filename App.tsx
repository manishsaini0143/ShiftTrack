import React from "react";
import AppNavigator from "./src/navigation/AppNavigator";
import { Platform, SafeAreaView, StatusBar } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={{flex:1, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0}}>
       <AppNavigator />
    </SafeAreaView>
  );
}
