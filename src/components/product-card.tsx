import { AntDesign, Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { Design } from "../constants/design";
import { PressScale, Reveal, staggerDelay } from "./motion";

export type CardProduct = {
  id: string;
  name: string;
  category?: string | null;
  price?: number | string | null;
  image_url?: string | null;
  rating?: number | null;
};

export function ProductCard({
  item,
  index = 0,
  onPress,
  isFavorite,
  onToggleFavorite,
  tag,
  footerAction,
}: {
  item: CardProduct;
  index?: number;
  onPress: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  tag?: string;
  footerAction?: React.ReactNode;
}) {
  return (
    <Reveal delay={staggerDelay(index)} style={styles.reveal}>
      <View style={styles.card}>
        <PressScale onPress={onPress} accessibilityLabel={`View ${item.name}`} style={styles.cardBody}>
          <View style={styles.imageWrap}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.image} contentFit="cover" transition={200} />
            ) : (
              <Feather name="box" size={42} color={Design.color.inkMuted} />
            )}
          </View>
          <View style={styles.copy}>
            {item.category ? <Text style={styles.category}>{item.category}</Text> : null}
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
        </PressScale>

{tag ? (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ) : null}

        {onToggleFavorite ? (
          <PressScale
            onPress={onToggleFavorite}
            accessibilityLabel={isFavorite ? "Remove from saved" : "Save furniture"}
            accessibilityState={{ selected: isFavorite }}
            style={[styles.heart, isFavorite && styles.heartActive]}
          >
            {isFavorite ? (
              <AntDesign name="heart" size={14} color={Design.color.accent} />
            ) : (
              <Feather name="heart" size={15} color={Design.color.ink} />
            )}
          </PressScale>
        ) : null}

        <View style={styles.metaOuter}>
          <View style={styles.metaLeft}>
            {item.price != null && item.price !== "" ? (
              <Text style={styles.price}>₱{Number(item.price).toLocaleString()}</Text>
            ) : null}
            {item.rating != null ? (
              <View style={styles.rating}>
                <AntDesign name="star" size={11} color={Design.color.accent} />
                <Text style={styles.ratingText}>{Number(item.rating).toFixed(1)}</Text>
              </View>
            ) : null}
          </View>
          {footerAction}
        </View>
      </View>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  reveal: { flex: 1 },
  card: { backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  cardBody: { flex: 1 },
  imageWrap: { alignItems: "center", aspectRatio: 1, backgroundColor: Design.color.surfaceMuted, justifyContent: "center", width: "100%" },
  image: { height: "100%", width: "100%" },
  tag: { backgroundColor: Design.color.accentDeep, borderRadius: Design.radius.small, left: 10, paddingHorizontal: 8, paddingVertical: 4, position: "absolute", top: 10 },
  tagText: { color: Design.color.surface, fontFamily: Design.font.monoBold, fontSize: 9, letterSpacing: 1 },
  heart: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.small, borderWidth: StyleSheet.hairlineWidth, height: 38, justifyContent: "center", position: "absolute", right: 10, top: 10, width: 38, zIndex: 1 },
  heartActive: { borderColor: Design.color.accent, borderWidth: 1 },
  copy: { gap: 4, paddingHorizontal: 14, paddingBottom: 6, paddingTop: 14 },
  category: { color: Design.color.accent, fontFamily: Design.font.monoMedium, fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase" },
  name: { color: Design.color.ink, fontFamily: Design.font.bodySemibold, fontSize: 20, letterSpacing: -0.3, lineHeight: 23 },
  metaOuter: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 14, paddingTop: 4 },
  metaLeft: { alignItems: "center", flexDirection: "row", gap: 10 },
  price: { color: Design.color.ink, fontFamily: Design.font.monoBold, fontSize: 13 },
  rating: { alignItems: "center", flexDirection: "row", gap: 4 },
  ratingText: { color: Design.color.inkSoft, fontFamily: Design.font.monoMedium, fontSize: 11 },
});