import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Design, layout } from "../constants/design";

type NavKey = "home" | "favorites" | "placement" | "cart" | "profile" | "dashboard" | "furniture" | "orders" | "logs";

const customerItems: { key: NavKey; label: string; icon: React.ComponentProps<typeof Feather>["name"]; route: string }[] = [
  { key: "home", label: "Home", icon: "home", route: "/(user)/home" },
  { key: "favorites", label: "Saved", icon: "heart", route: "/(user)/favorites" },
  { key: "placement", label: "Place", icon: "image", route: "/(user)/image-placement" },
  { key: "cart", label: "Cart", icon: "shopping-bag", route: "/(user)/cart" },
  { key: "profile", label: "Profile", icon: "user", route: "/(user)/profile" },
];

const adminItems: { key: NavKey; label: string; icon: React.ComponentProps<typeof Feather>["name"]; route: string }[] = [
  { key: "dashboard", label: "Overview", icon: "grid", route: "/(admin)/dashboard" },
  { key: "furniture", label: "Furniture", icon: "package", route: "/(admin)/manage-furniture" },
  { key: "orders", label: "Orders", icon: "shopping-bag", route: "/(admin)/manage-orders" },
  { key: "logs", label: "Activity", icon: "activity", route: "/(admin)/activity-logs" },
  { key: "profile", label: "Profile", icon: "user", route: "/(admin)/profile" },
];

export function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <View accessible accessibilityLabel="Atelier Carvén">
      <Text style={[styles.brandOverline, inverse && styles.brandOverlineInverse]}>ATELIER</Text>
      <Text style={[styles.brandName, inverse && styles.brandNameInverse]}>Carvén</Text>
    </View>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderCopy}>
        <Text style={styles.pageTitle}>{title}</Text>
        {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled = false, style }: { label: string; onPress: () => void; disabled?: boolean; style?: ViewStyle }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, disabled && styles.buttonDisabled, pressed && styles.buttonPressed, style]}
    >
      <Text style={styles.primaryButtonLabel}>{label}</Text>
    </Pressable>
  );
}

function Navigation({ active, items, admin = false }: { active: NavKey; items: typeof customerItems; admin?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && width >= layout.desktopBreakpoint;

  const go = (route: string) => router.replace(route as never);

  if (desktop) {
    return (
      <View style={[styles.desktopNav, admin && styles.desktopAdminNav]}>
        <BrandMark />
        <View style={styles.desktopNavLinks}>
          {items.map((item) => {
            const selected = item.key === active;
            return (
              <Pressable key={item.key} onPress={() => go(item.route)} style={({ pressed }) => [styles.desktopNavItem, selected && styles.desktopNavItemSelected, pressed && styles.buttonPressed]}>
                <Feather name={item.icon} size={15} color={selected ? Design.color.surface : Design.color.inkSoft} />
                <Text style={[styles.desktopNavLabel, selected && styles.desktopNavLabelSelected]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.mobileNav, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {items.map((item) => {
        const selected = item.key === active;
        return (
          <Pressable key={item.key} onPress={() => go(item.route)} style={({ pressed }) => [styles.mobileNavItem, pressed && styles.buttonPressed]} hitSlop={4}>
            <Feather name={item.icon} size={19} color={selected ? Design.color.ink : Design.color.inkMuted} />
            <Text style={[styles.mobileNavLabel, selected && styles.mobileNavLabelSelected]}>{item.label}</Text>
            {selected ? <View style={styles.activeDot} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function CustomerNavigation({ active }: { active: Extract<NavKey, "home" | "favorites" | "placement" | "cart" | "profile"> }) {
  return <Navigation active={active} items={customerItems} />;
}

export function AdminNavigation({ active }: { active: Extract<NavKey, "dashboard" | "furniture" | "orders" | "logs" | "profile"> }) {
  return <Navigation active={active} items={adminItems} admin />;
}

export function ContentFrame({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && width >= layout.desktopBreakpoint;
  return <View style={[styles.contentFrame, desktop && styles.contentFrameDesktop, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  brandOverline: { color: Design.color.gold, fontFamily: Design.font.bodySemibold, fontSize: 9, letterSpacing: 3.2 },
  brandOverlineInverse: { color: Design.color.goldSoft },
  brandName: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 28, lineHeight: 30, letterSpacing: -0.7 },
  brandNameInverse: { color: Design.color.surface },
  pageHeader: { alignItems: "flex-start", flexDirection: "row", gap: Design.space.md, justifyContent: "space-between", marginBottom: Design.space.xl },
  pageHeaderCopy: { flex: 1 },
  pageTitle: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 42, letterSpacing: -1.3, lineHeight: 43 },
  pageSubtitle: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 13, lineHeight: 21, marginTop: 6, maxWidth: 460 },
  primaryButton: { alignItems: "center", backgroundColor: Design.color.ink, borderRadius: Design.radius.small, justifyContent: "center", minHeight: 52, paddingHorizontal: 20 },
  primaryButtonLabel: { color: Design.color.surface, fontFamily: Design.font.bodyBold, fontSize: 11, letterSpacing: 1.25 },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  buttonDisabled: { opacity: 0.5 },
  desktopNav: { alignItems: "center", backgroundColor: "rgba(255,252,248,0.96)", borderBottomColor: Design.color.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", minHeight: 74, paddingHorizontal: 42 },
  desktopAdminNav: { backgroundColor: Design.color.surfaceMuted },
  desktopNavLinks: { alignItems: "center", flexDirection: "row", gap: 4 },
  desktopNavItem: { alignItems: "center", borderRadius: Design.radius.pill, flexDirection: "row", gap: 8, minHeight: 42, paddingHorizontal: 13 },
  desktopNavItemSelected: { backgroundColor: Design.color.ink },
  desktopNavLabel: { color: Design.color.inkSoft, fontFamily: Design.font.bodyMedium, fontSize: 12 },
  desktopNavLabelSelected: { color: Design.color.surface },
  mobileNav: { alignItems: "flex-start", backgroundColor: Design.color.surface, borderTopColor: Design.color.line, borderTopWidth: StyleSheet.hairlineWidth, bottom: 0, flexDirection: "row", justifyContent: "space-around", left: 0, paddingTop: 10, position: "absolute", right: 0 },
  mobileNavItem: { alignItems: "center", flex: 1, gap: 4, minHeight: 46 },
  mobileNavLabel: { color: Design.color.inkMuted, fontFamily: Design.font.bodyMedium, fontSize: 9 },
  mobileNavLabelSelected: { color: Design.color.ink },
  activeDot: { backgroundColor: Design.color.gold, borderRadius: 2, height: 3, marginTop: 1, width: 14 },
  contentFrame: { flex: 1 },
  contentFrameDesktop: { alignSelf: "center", maxWidth: layout.pageMaxWidth, width: "100%" },
});
