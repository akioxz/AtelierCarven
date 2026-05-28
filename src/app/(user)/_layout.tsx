import { Stack } from "expo-router";
import { StyleSheet, useWindowDimensions, View } from "react-native";

export default function UserLayout() {
  const { width } = useWindowDimensions();
  const isWeb = width > 768;

  if (isWeb) {
    return (
      <View style={styles.webContainer}>
        <View style={styles.phoneFrame}>
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: "#E8E0D0",
    justifyContent: "center",
    alignItems: "center",
  },
  phoneFrame: {
    width: 390,
    height: 844,
    backgroundColor: "#FAFAF8",
    borderRadius: 40,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
});
