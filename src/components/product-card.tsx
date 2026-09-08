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
              <AntDesign name="heart" size={14} color={Design.color.gold} />
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
                <AntDesign name="star" size={11} color={Design.color.gold} />
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
  card: { backgroundColor: Design.color.surface, borderRadius: Design.radius.card, overflow: "hidden", ...Design.shadow.card },
  cardBody: { flex: 1 },
  imageWrap: { alignItems: "center", aspectRatio: 1, backgroundColor: Design.color.surfaceMuted, justifyContent: "center", width: "100%" },
  image: { height: "100%", width: "100%" },
  tag: { backgroundColor: Design.color.goldSoft, borderRadius: Design.radius.pill, left: 10, paddingHorizontal: 10, paddingVertical: 5, position: "absolute", top: 10 },
  tagText: { color: Design.color.ink, fontFamily: Design.font.bodySemibold, fontSize: 10, letterSpacing: 0.8 },
  heart: { alignItems: "center", backgroundColor: Design.color.surface, borderRadius: 19, height: 38, justifyContent: "center", position: "absolute", right: 10, top: 10, width: 38, zIndex: 1 },
  heartActive: { borderColor: Design.color.goldSoft, borderWidth: 1 },
  copy: { gap: 4, paddingHorizontal: 14, paddingBottom: 6, paddingTop: 14 },
  category: { color: Design.color.gold, fontFamily: Design.font.bodySemibold, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase" },
  name: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 21, letterSpacing: -0.4, lineHeight: 23 },
  metaOuter: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 14, paddingTop: 4 },
  metaLeft: { alignItems: "center", flexDirection: "row", gap: 10 },
  price: { color: Design.color.ink, fontFamily: Design.font.bodyBold, fontSize: 13 },
  rating: { alignItems: "center", flexDirection: "row", gap: 4 },
  ratingText: { color: Design.color.inkSoft, fontFamily: Design.font.bodyMedium, fontSize: 11 },
});