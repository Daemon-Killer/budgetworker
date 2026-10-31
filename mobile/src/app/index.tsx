import { Redirect, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  if (process.env.EXPO_PUBLIC_APP_VARIANT === "customer") return <Redirect href="/consumer" />;
  return <SafeAreaView style={styles.safe}><View style={styles.content}>
    <Text style={styles.brand}>BudgetWorker</Text>
    <Text style={styles.tagline}>Trusted help. Better homes.</Text>
    <Text style={styles.heading}>आपका स्वागत है{`\n`}How can we help?</Text>
    <Pressable accessibilityRole="button" style={styles.customer} onPress={() => router.push("/consumer")}><Text style={styles.button}>मुझे घर के लिए मदद चाहिए</Text><Text style={styles.small}>Find help for my home →</Text></Pressable>
    <Pressable accessibilityRole="button" style={styles.worker} onPress={() => router.push("/worker")}><Text style={styles.button}>BudgetWorker Saathi</Text><Text style={styles.small}>मुझे काम चाहिए · Find work & manage my job →</Text></Pressable>
    <Text style={styles.note}>एक ऐप, आपके दोनों काम।{`\n`}Customer and worker services in one app.</Text>
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({safe:{flex:1,backgroundColor:"#f4faf7"},content:{flex:1,justifyContent:"center",padding:28},brand:{fontSize:32,fontWeight:"800",color:"#087da5"},tagline:{color:"#158457",fontSize:15,marginTop:7},heading:{fontSize:26,fontWeight:"700",color:"#203449",lineHeight:38,marginTop:52,marginBottom:28},customer:{backgroundColor:"#257bd1",padding:22,borderRadius:16,marginBottom:18},worker:{backgroundColor:"#159756",padding:22,borderRadius:16},button:{color:"white",fontWeight:"700",fontSize:19},small:{color:"#f0faf7",fontSize:13,marginTop:9,lineHeight:22},note:{textAlign:"center",color:"#73857e",fontSize:12,lineHeight:21,marginTop:35}});
