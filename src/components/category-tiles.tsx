import { Feather } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Design } from "../constants/design";

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  Sofa: "airplay",
  Chair: "sidebar",
  Table: "minus-square",
  Bed: "moon",
};

export function CategoryTiles({ categories, selected, onSelect }: { categories: string[]; selected: string; onSelect: (category: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.band}>
      {categories.map((category) => {
        const active = category === selected;
        return (
          <Pressable
            key={category}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(category)}
            style={({ pressed }) => [styles.tile, active && styles.tileActive, pressed && styles.pressed]}
          >
            <View style={[styles.tileIcon, active && styles.tileIconActive]}>
              <Feather name={CATEGORY_ICONS[category] ?? "box"} size={22} color={active ? Design.color.gold : Design.color.inkSoft} />
            </View>
            <Text style={[styles.tileLabel, active && styles.tileLabelActive]}>{category}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  band: { gap: 10, paddingHorizontal: 2, paddingVertical: 14 },
  tile: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 12, width: 76 },
  tileActive: { backgroundColor: Design.color.surfaceMuted, borderColor: Design.color.gold },
  tileIcon: { alignItems: "center", backgroundColor: Design.color.surfaceMuted, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  tileIconActive: { backgroundColor: "transparent" },
  tileLabel: { color: Design.color.inkSoft, fontFamily: Design.font.bodySemibold, fontSize: 11, marginTop: 7 },
  tileLabelActive: { color: Design.color.ink },
  pressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
});