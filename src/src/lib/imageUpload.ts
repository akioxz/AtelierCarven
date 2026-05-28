import * as ImagePicker from "expo-image-picker";
import { supabase } from "./supabase";

export const pickAndUploadImage = async (
  bucket: string,
  folder: string,
): Promise<string | null> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    alert("Permission to access photos is required!");
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'] as any,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled) return null;

  const uri = result.assets[0].uri;
  const fileName = `${folder}/${Date.now()}.jpg`;

  const response = await fetch(uri);
  const blob = await response.blob();
  const arrayBuffer = await new Response(blob).arrayBuffer();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, arrayBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) {
    console.error("Upload error:", error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
};
