import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, BackHandler, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { CUSTOMER_BRIDGE } from "../lib/customer-bridge";
import { activeCustomerTab, CUSTOMER_TABS, CUSTOMER_URL, customerNavigation, isCustomerUrl, isResumeUrl } from "../lib/customer-navigation";

export function CustomerApp() {
  const web = useRef<WebView>(null);
  const currentUrl = useRef(CUSTOMER_URL + "/");
  const backStack = useRef([CUSTOMER_URL + "/"]);
  const downloading = useRef(false);
  const locating = useRef(false);
  const paying = useRef(false);
  const [source, setSource] = useState({ uri: CUSTOMER_URL + "/" });
  const [tab, setTab] = useState("/");
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [backAvailable, setBackAvailable] = useState(false);

  function recordNavigation(value: string) {
    const url = new URL(value);
    url.hash = "";
    const address = url.href;
    const history = backStack.current;
    if (history.at(-2) === address) history.pop();
    else if (history.at(-1) !== address) history.push(address);
    currentUrl.current = address;
    setBackAvailable(history.length > 1);
    setTab(activeCustomerTab(address));
  }

  // Android's native WebView history can report no back entry after website
  // router transitions. Keep the actual visited customer URLs as a fallback.
  const goBack = useCallback(() => {
    const history = backStack.current;
    if (history.length < 2) return false;
    history.pop();
    const destination = history.at(-1)!;
    currentUrl.current = destination;
    setTab(activeCustomerTab(destination));
    setBackAvailable(history.length > 1);
    web.current?.injectJavaScript(`window.location.replace(${JSON.stringify(destination)}); true;`);
    return true;
  }, []);

  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (failed) return false;
      return goBack();
    });
    return () => listener.remove();
  }, [failed, goBack]);

  async function openExternal(url: string) {
    try { await Linking.openURL(url); }
    catch { Alert.alert("Unable to open link", "Install a compatible app, or choose another payment method."); }
  }

  function navigate(path: string) {
    const go = () => {
      setTab(path);
      if (failed) { setFailed(false); setSource({ uri: CUSTOMER_URL + path }); web.current?.reload(); }
      else web.current?.injectJavaScript(`window.location.assign(${JSON.stringify(CUSTOMER_URL + path)}); true;`);
    };
    if (/\/book$/.test(new URL(currentUrl.current).pathname)) {
      Alert.alert("Leave this booking?", "Your current answers may be lost. Paid and pending bookings are available in Bookings.", [
        { text: "Keep editing", style: "cancel" }, { text: "Leave", onPress: go },
      ]);
    } else go();
  }

  async function onMessage(event: WebViewMessageEvent) {
    if (!isCustomerUrl(event.nativeEvent.url) || !isCustomerUrl(currentUrl.current)) return;
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === "navigation" && typeof message.url === "string" && isCustomerUrl(message.url)) {
        recordNavigation(message.url);
      } else if (message.type === "location" && Number.isSafeInteger(message.id) && message.id > 0) {
        if (locating.current) return;
        locating.current = true;
        const page = currentUrl.current;
        let result;
        try {
          const permission = await Location.requestForegroundPermissionsAsync();
          if (!permission.granted) throw Error("Location access was declined. Choose your city and area instead.");
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          result = { coords: { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }, timestamp: position.timestamp };
        } catch (error) { result = { error: error instanceof Error ? error.message : "Unable to locate you. Choose your city and area instead." }; }
        finally { locating.current = false; }
        if (page === currentUrl.current) web.current?.injectJavaScript(`if (location.origin === ${JSON.stringify(CUSTOMER_URL)}) window.__bwLocationResult?.(${message.id}, ${JSON.stringify(result)}); true;`);
      } else if (message.type === "payment" && Number.isSafeInteger(message.id) && message.id > 0) {
        if (paying.current) return;
        const options = message.options;
        if (!options || !/^rzp_(test|live)_[A-Za-z0-9]+$/.test(options.key) || !/^order_[A-Za-z0-9]+$/.test(options.order_id) || !Number.isSafeInteger(options.amount) || options.amount <= 0 || options.currency !== "INR") {
          web.current?.injectJavaScript(`void window.__bwPaymentResult?.(${message.id}, {success:false, message:'Invalid checkout details. Please retry.'}); true;`);
          return;
        }
        paying.current = true;
        const page = currentUrl.current;
        let result;
        try {
          const { default: RazorpayCheckout } = await import("react-native-razorpay");
          const data = await RazorpayCheckout.open({
            key: options.key, order_id: options.order_id, amount: options.amount, currency: "INR", name: "BudgetWorker",
            description: typeof options.description === "string" ? options.description.slice(0, 250) : "Home help booking",
            prefill: options.prefill, theme: { color: "#204be6" },
          });
          result = { success: true, data };
        } catch (error) {
          const failure = error as { code?: number; description?: string };
          result = { success: false, cancelled: failure.code === 0, message: failure.description || "Payment could not be completed. Retry from your saved booking." };
        } finally { paying.current = false; }
        if (page === currentUrl.current) web.current?.injectJavaScript(`if (location.origin === ${JSON.stringify(CUSTOMER_URL)}) void window.__bwPaymentResult?.(${message.id}, ${JSON.stringify(result)}); true;`);
      } else if (message.type === "download-start") {
        setDownloadBusy(true);
      } else if (message.type === "download-error") {
        setDownloadBusy(false);
        Alert.alert("Please try again", typeof message.message === "string" ? message.message.slice(0, 300) : "Unable to complete this action.");
      } else if (message.type === "resume" && typeof message.data === "string" && message.data.length <= 16 * 1024 * 1024 && /^[A-Za-z0-9+/]*={0,2}$/.test(message.data)) {
        if (downloading.current) return;
        downloading.current = true;
        try {
          const bytes = Uint8Array.from(atob(message.data), char => char.charCodeAt(0));
          if (String.fromCharCode(...bytes.subarray(0, 5)) !== "%PDF-") throw Error("The downloaded file is not a PDF.");
          if (!await Sharing.isAvailableAsync()) throw Error("No PDF viewer or sharing app is available on this device.");
          const file = new File(Paths.cache, `budgetworker-resume-${Date.now()}.pdf`);
          file.write(bytes);
          await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", dialogTitle: "Save or open resume" });
        } finally {
          downloading.current = false; setDownloadBusy(false);
        }
      } else if (message.type === "interview" && typeof message.url === "string" && isCustomerUrl(message.url)) {
        await openExternal(message.url);
      }
    } catch (error) {
      setDownloadBusy(false);
      Alert.alert("Unable to complete action", error instanceof Error ? error.message : "Please try again.");
    }
  }

  return <SafeAreaView style={styles.safe}>
    <StatusBar style="dark" />
    <View style={styles.toolbar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" disabled={!backAvailable || failed} onPress={goBack} style={styles.toolButton}>
        <Text style={[styles.toolText, (!backAvailable || failed) && styles.disabled]}>‹ Back</Text>
      </Pressable>
      <Text style={styles.brand}>BudgetWorker</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Refresh page" style={styles.toolButton} onPress={() => { setFailed(false); web.current?.reload(); }}><Text style={styles.toolText}>↻</Text></Pressable>
    </View>
    {Platform.OS === "web" ? <View style={styles.message}>
      <Text style={styles.title}>Home help, made simpler.</Text>
      <Pressable accessibilityRole="link" onPress={() => void openExternal(CUSTOMER_URL)} style={styles.button}><Text style={styles.buttonText}>Open BudgetWorker</Text></Pressable>
    </View> : <View style={styles.body}>
      <WebView
        ref={web}
        source={source}
        style={[styles.web, failed && styles.hidden]}
        applicationNameForUserAgent="BudgetWorkerCustomer/1.0.0"
        javaScriptEnabled domStorageEnabled sharedCookiesEnabled thirdPartyCookiesEnabled
        injectedJavaScriptBeforeContentLoaded={CUSTOMER_BRIDGE}
        injectedJavaScript={CUSTOMER_BRIDGE}
        injectedJavaScriptBeforeContentLoadedForMainFrameOnly
        injectedJavaScriptForMainFrameOnly
        originWhitelist={["*"]}
        mixedContentMode="never"
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        javaScriptCanOpenWindowsAutomatically={false}
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures
        onShouldStartLoadWithRequest={request => {
          // Bank/checkout frames must be able to submit without leaving their parent.
          if (request.isTopFrame === false && request.url.startsWith("https://")) return true;
          if (request.url === "about:blank") return true;
          if (isResumeUrl(request.url)) {
            web.current?.injectJavaScript(`window.__bwDownload?.(${JSON.stringify(request.url)}); true;`); return false;
          }
          const action = customerNavigation(request.url);
          if (action === "external") void openExternal(request.url);
          return action === "internal";
        }}
        onMessage={event => void onMessage(event)}
        onNavigationStateChange={state => {
          if (!state.loading && isCustomerUrl(state.url)) recordNavigation(state.url);
        }}
        onLoadStart={event => {
          setLoading(true); setFailed(false);
          if (isCustomerUrl(event.nativeEvent.url)) currentUrl.current = event.nativeEvent.url;
        }}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setFailed(true); setLoading(false); }}
        onHttpError={event => {
          if (event.nativeEvent.url === currentUrl.current && event.nativeEvent.statusCode >= 400) { setFailed(true); setLoading(false); }
        }}
        onRenderProcessGone={() => { setFailed(true); setLoading(false); }}
        onContentProcessDidTerminate={() => { setFailed(true); setLoading(false); }}
      />
      {loading && !failed ? <View style={styles.progress} accessibilityLabel="Loading page"><ActivityIndicator color="#204be6" size="small" /></View> : null}
      {failed ? <View style={styles.message}>
        <Text style={styles.title}>Let’s get you reconnected</Text>
        <Text style={styles.description}>Check your internet connection, then try again. Your account and saved bookings will be here when you return.</Text>
        <Pressable accessibilityRole="button" onPress={() => { setFailed(false); web.current?.reload(); }} style={styles.button}><Text style={styles.buttonText}>Try again</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => navigate("/")} style={styles.toolButton}><Text style={styles.toolText}>Go to home</Text></Pressable>
      </View> : null}
      {downloadBusy ? <View style={styles.download}><ActivityIndicator color="#204be6" /><Text style={styles.description}>Opening your resume…</Text></View> : null}
    </View>}
    <View accessibilityRole="tablist" style={styles.tabs}>
      {CUSTOMER_TABS.map(item => <Pressable key={item.path} accessibilityRole="tab" accessibilityState={{ selected: tab === item.path }} onPress={() => navigate(item.path)} style={[styles.tab, tab === item.path && styles.tabSelected]}>
        <Text style={[styles.tabIcon, tab === item.path && styles.selected]}>{item.icon}</Text>
        <Text style={[styles.tabLabel, tab === item.path && styles.selected]}>{item.label}</Text>
      </Pressable>)}
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "white" },
  body: { flex: 1 }, web: { flex: 1, backgroundColor: "#f7f8fa" }, hidden: { display: "none" },
  toolbar: { minHeight: 52, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderColor: "#e1e6ef" },
  brand: { fontSize: 17, fontWeight: "800", color: "#17243c" },
  toolButton: { minHeight: 44, minWidth: 52, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  toolText: { color: "#204be6", fontSize: 17, fontWeight: "600" }, disabled: { color: "#a5aebb" },
  tabs: { flexDirection: "row", borderTopWidth: 1, borderColor: "#e1e6ef", paddingTop: 6, paddingHorizontal: 8, backgroundColor: "white" },
  tab: { flex: 1, minHeight: 58, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: 12 },
  tabSelected: { backgroundColor: "#eef3ff" }, tabIcon: { fontSize: 24, color: "#64748b" },
  tabLabel: { fontSize: 11, fontWeight: "600", color: "#64748b" }, selected: { color: "#204be6" },
  progress: { position: "absolute", top: 0, left: 0, right: 0, padding: 8, backgroundColor: "#ffffffdd" },
  message: { flex: 1, justifyContent: "center", alignItems: "center", padding: 28, gap: 18 },
  title: { fontSize: 25, fontWeight: "700", color: "#17243c", textAlign: "center" },
  description: { fontSize: 14, lineHeight: 23, color: "#64748b", textAlign: "center" },
  button: { backgroundColor: "#204be6", minHeight: 48, borderRadius: 12, paddingHorizontal: 26, justifyContent: "center" },
  buttonText: { color: "white", fontSize: 15, fontWeight: "600" },
  download: { position: "absolute", bottom: 12, left: 16, right: 16, padding: 16, backgroundColor: "#eef3ff", borderRadius: 12, alignItems: "center", gap: 8 },
});
