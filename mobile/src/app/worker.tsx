import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { WebView } from "react-native-webview";
import * as Speech from "expo-speech";

// Keep the worker experience on the same production origin as its APIs/cookies.
const SAATHI_URL = "https://budgetworker.in/saathi";
const hosts = new Set(["budgetworker.in", "www.budgetworker.in"]);
export default function Worker() {
  useEffect(() => () => { void Speech.stop(); }, []);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
    <View style={styles.toolbar}><Pressable accessibilityRole="button" onPress={() => router.replace("/")}><Text style={styles.back}>← ऐप मेनू / App menu</Text></Pressable><Text style={styles.caption}>WORKER MODE</Text></View>
    {Platform.OS === "web" ? <View style={styles.message}><Text style={styles.title}>BudgetWorker Saathi</Text><Pressable accessibilityRole="link" style={styles.button} onPress={() => void Linking.openURL(SAATHI_URL)}><Text style={styles.buttonText}>साथी खोलें / Open Saathi</Text></Pressable></View> : failed ? <View style={styles.message}><Text style={styles.title}>कनेक्शन नहीं हो पाया</Text><Text style={styles.description}>Please check your internet connection and try again.</Text><Pressable accessibilityRole="button" style={styles.button} onPress={() => { setFailed(false); setAttempt(n => n + 1); }}><Text style={styles.buttonText}>दोबारा कोशिश करें / Retry</Text></Pressable></View> : <WebView key={attempt} source={{uri:SAATHI_URL}} style={styles.web} startInLoadingState renderLoading={() => <View style={styles.loading}><ActivityIndicator size="large" color="#159756"/><Text style={styles.description}>Saathi खुल रहा है…</Text></View>} originWhitelist={["*"]} mixedContentMode="never" allowFileAccess={false} allowUniversalAccessFromFileURLs={false} javaScriptCanOpenWindowsAutomatically={false} setSupportMultipleWindows={false} onShouldStartLoadWithRequest={request => {
      if (request.url === "about:blank") return true;
      if (/^tel:\+?[0-9]+$/.test(request.url)) { void Linking.openURL(request.url).catch(() => {}); return false; }
      try { const url = new URL(request.url); return url.protocol === "https:" && hosts.has(url.hostname); } catch { return false; }
    }} onMessage={event => {
      try {
        const source = new URL(event.nativeEvent.url);
        if (source.protocol !== "https:" || !hosts.has(source.hostname) || !source.pathname.startsWith("/saathi")) return;
        const message = JSON.parse(event.nativeEvent.data);
        if (message.type !== "saathi:speak" || typeof message.text !== "string" || message.text.length > 10000 || !["hi", "en"].includes(message.language)) return;
        void Speech.stop().then(() => Speech.speak(message.text, { language: message.language === "hi" ? "hi-IN" : "en-IN" }));
      } catch { /* Ignore messages outside the supported speech bridge. */ }
    }} onError={() => setFailed(true)} onHttpError={event => { if (event.nativeEvent.statusCode >= 500) setFailed(true); }}/>}
  </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:"#fff"},toolbar:{paddingHorizontal:16,paddingVertical:12,flexDirection:"row",justifyContent:"space-between",alignItems:"center",borderBottomWidth:1,borderColor:"#e4ece9"},back:{color:"#137e5b",fontSize:13,fontWeight:"600"},caption:{color:"#83938c",fontSize:9,letterSpacing:1},web:{flex:1,backgroundColor:"#f5faf8"},loading:{position:"absolute",top:0,right:0,bottom:0,left:0,alignItems:"center",justifyContent:"center",backgroundColor:"#f5faf8"},message:{flex:1,padding:28,justifyContent:"center",alignItems:"center"},title:{fontSize:23,fontWeight:"700",color:"#203449",marginBottom:12},description:{fontSize:14,color:"#73857e",textAlign:"center",marginTop:16,lineHeight:23},button:{backgroundColor:"#159756",padding:17,borderRadius:10,marginTop:25},buttonText:{color:"white",fontWeight:"700"}});
