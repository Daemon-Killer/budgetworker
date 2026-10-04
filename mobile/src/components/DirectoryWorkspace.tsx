import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import * as Location from "expo-location";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { API_URL, getToken, request, saveToken } from "../lib/api";
import { CATEGORIES, LABELS } from "../../../shared/marketplace";
import {
  emptyFilters,
  directoryQuery,
  periodLabels,
  type DirectoryFilters,
  type DirectoryResult,
  type DirectoryWorker,
  type ResumePack,
} from "../../../shared/directory";
import { Button, Choices, Field, styles } from "./DirectoryUI";
import { DirectoryLogin } from "./DirectoryLogin";
import { DirectoryAdmin } from "./DirectoryAdmin";
type Account = {
  user: { id: string; name: string | null; role: string } | null;
  balance: number;
};
export function DirectoryWorkspace({
  mode = "consumer",
}: {
  mode?: "consumer" | "admin";
}) {
  const [account, setAccount] = useState<Account>({ user: null, balance: 0 }),
    [result, setResult] = useState<DirectoryResult>({
      workers: [],
      total: 0,
      page: 1,
      pageSize: 24,
    }),
    [filters, setFilters] = useState<DirectoryFilters>({ ...emptyFilters }),
    [applied, setApplied] = useState<DirectoryFilters>({ ...emptyFilters }),
    [packs, setPacks] = useState<ResumePack[]>([]),
    [unlocked, setUnlocked] = useState<DirectoryWorker[]>([]),
    [tab, setTab] = useState("browse"),
    [showFilters, setShowFilters] = useState(false),
    [showLogin, setShowLogin] = useState(false),
    [selected, setSelected] = useState<DirectoryWorker | null>(null),
    [showDetails, setShowDetails] = useState(false),
    [busy, setBusy] = useState(false),
    [refreshing, setRefreshing] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const latest = useRef(0);
  const refreshAccount = useCallback(async () => {
    const d = await request<Account>("auth/me");
    setAccount(d);
    if (d.user) {
      const saved = await request<{ unlocks: { worker: DirectoryWorker }[] }>(
        "mobile/saved",
      );
      setUnlocked(saved.unlocks.map((x) => x.worker));
    } else setUnlocked([]);
  }, []);
  const search = useCallback(async (f: DirectoryFilters, page = 1) => {
    const n = ++latest.current;
    const d = await request<DirectoryResult>(
      "workers?" + directoryQuery(f, page),
    );
    if (n === latest.current) {
      setResult(d);
      setApplied(f);
    }
  }, []);
  useEffect(() => {
    let mounted = true;
    Promise.resolve()
      .then(() =>
        Promise.all([
          refreshAccount(),
          request<{ packs: ResumePack[] }>("packs").then((d) => {
            if (mounted) setPacks(d.packs);
          }),
          search(emptyFilters),
        ]),
      )
      .catch((e) => {
        if (mounted) setError(e.message);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, [refreshAccount, search]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshAccount().catch(() => {});
    });
    return () => sub.remove();
  }, [refreshAccount]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to complete this action",
      );
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    setRefreshing(true);
    setError("");
    try {
      await Promise.all([refreshAccount(), search(applied, result.page)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to refresh");
    } finally {
      setRefreshing(false);
    }
  }
  async function locate() {
    await run(async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        throw Error(
          "Location access is unavailable. Choose your city and area instead.",
        );
      const p = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const f = {
        ...filters,
        city: "",
        area: "",
        lat: String(p.coords.latitude),
        lng: String(p.coords.longitude),
      };
      setFilters(f);
      await search(f);
      setShowFilters(false);
    });
  }
  async function checkout() {
    if (!account.user) {
      setShowLogin(true);
      return;
    }
    await run(async () => {
      const d = await request<{ url: string }>("mobile/checkout", "POST", {});
      await Linking.openURL(d.url);
      setNotice(
        "Complete checkout on the secure website, then return here. Pull down to refresh your credits.",
      );
    });
  }
  async function openResume(w: DirectoryWorker) {
    await run(async () => {
      const token = await getToken();
      if (!token) throw Error("Please log in first");
      let current = w;
      if (!w.unlocked) {
        await request("mobile/directory/" + w.id + "/unlock", "POST", {});
        current = (
          await request<{ worker: DirectoryWorker }>("mobile/directory/" + w.id)
        ).worker;
        await refreshAccount();
        await search(applied, result.page);
        setSelected(current);
      }
      const url = API_URL + "/api/mobile/directory/" + w.id + "/resume";
      if (Platform.OS === "web") {
        const r = await fetch(url, {
          headers: { Authorization: "Bearer " + token },
        });
        if (!r.ok) throw Error("Unable to open resume");
        const object = URL.createObjectURL(await r.blob());
        const a = document.createElement("a");
        a.href = object;
        a.download = current.resumeFileName ?? "resume.pdf";
        a.click();
        setTimeout(() => URL.revokeObjectURL(object), 1000);
      } else {
        const filename = (current.resumeFileName ?? "resume.pdf").replace(
          /[^a-zA-Z0-9._-]/g,
          "_",
        );
        const file = await File.downloadFileAsync(
          url,
          new File(Paths.cache, w.id + "-" + filename),
          { headers: { Authorization: "Bearer " + token }, idempotent: true },
        );
        if (await Sharing.isAvailableAsync())
          await Sharing.shareAsync(file.uri);
        else throw Error("No file viewer is available on this device");
      }
    });
  }
  const change = (key: keyof DirectoryFilters, value: string) =>
    setFilters((f) => ({
      ...f,
      [key]: value,
      ...(key === "city" || key === "area" ? { lat: "", lng: "" } : {}),
    }));
  const login = (
    <DirectoryLogin
      onDone={async () => {
        await refreshAccount();
        await search(applied, result.page);
        setShowLogin(false);
      }}
    />
  );
  function profile(w: DirectoryWorker) {
    return (
      <View key={w.id} style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{w.name.slice(0, 1)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{w.name}</Text>
            <Text style={styles.small}>
              {LABELS[w.category]} ·{" "}
              {w.employmentType === "PART_TIME" ? "Part time" : "Full time"}
            </Text>
          </View>
        </View>
        <Text style={styles.body}>
          {[w.area, w.city].filter(Boolean).join(", ")}
          {w.distanceKm === undefined
            ? ""
            : " · Approx. " + w.distanceKm + " km"}
        </Text>
        <View style={styles.chips}>
          <Text style={styles.small}>
            {w.experienceYears == null
              ? "Experience to discuss"
              : w.experienceYears + " years’ experience"}
          </Text>
          <Text style={styles.small}>
            ·{" "}
            {w.hoursPerDay == null
              ? "Hours to discuss"
              : w.hoursPerDay + " hours / day"}
          </Text>
        </View>
        {w.skill && <Text style={styles.body}>{w.skill}</Text>}
        {w.about && <Text style={styles.small}>{w.about}</Text>}
        <View style={styles.chips}>
          {w.policeVerified && (
            <Text style={styles.tag}>✓ Police verified</Text>
          )}
          {w.aadhaarVerified && (
            <Text style={styles.tag}>✓ Aadhaar verified</Text>
          )}
        </View>
        <View style={styles.divider} />
        <Text style={styles.pay}>
          {w.expectedPayInr == null
            ? w.salaryExpectation || "Pay to discuss"
            : "₹" +
              w.expectedPayInr.toLocaleString("en-IN") +
              " / " +
              periodLabels[w.payPeriod]}
        </Text>
        <Button
          title={w.unlocked ? "Open resume ↗" : "View resume ↗"}
          disabled={!w.hasResume || busy}
          onPress={() => {
            setSelected(w);
            setShowDetails(false);
            setError("");
          }}
        />
        <Text style={styles.small}>
          {w.hasResume
            ? "1 credit unlocks the full resume · Profile details are free"
            : "Resume coming soon"}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setSelected(w);
            setShowDetails(true);
            setError("");
          }}
        >
          <Text style={styles.tag}>All profile details →</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/consumer")}
        >
          <Text style={styles.brand}>B. budgetworker</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            account.user
              ? void run(async () => {
                  await request("mobile/auth/logout", "POST", {});
                  await saveToken(null);
                  await refreshAccount();
                  await search(applied, result.page);
                })
              : setShowLogin(true)
          }
        >
          <Text style={styles.tag}>{account.user ? "Log out" : "Log in"}</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
            />
          }
        >
          <Text style={styles.eyebrow}>
            {mode === "admin" ? "DIRECTORY MANAGEMENT" : "HOME HELP, YOUR WAY"}
          </Text>
          <Text style={styles.title}>
            {mode === "admin"
              ? "Profiles & resumes"
              : "Good help.\nClose to home."}
          </Text>
          <Text style={styles.body}>
            {mode === "admin"
              ? "Publish worker details and upload the resume families can unlock."
              : "Choose your location, hours and budget. Browse profiles for free, then unlock the resumes you want."}
          </Text>
          {account.user?.role === "ADMIN" && (
            <View style={styles.chips}>
              <Button
                title="Browse workers"
                secondary
                onPress={() => router.replace("/consumer")}
              />
              <Button
                title="Admin"
                secondary
                onPress={() => router.replace("/admin")}
              />
            </View>
          )}
          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          {notice && <Text style={styles.notice}>{notice}</Text>}
          {!ready && <ActivityIndicator color="#204be6" />}
          {mode === "admin" ? (
            account.user?.role === "ADMIN" ? (
              <DirectoryAdmin />
            ) : account.user ? (
              <Text style={styles.error}>
                This account does not have admin access.
              </Text>
            ) : (
              login
            )
          ) : (
            <>
              <Choices
                label="Explore"
                options={[
                  ["browse", "Workers"],
                  ["saved", "My resumes"],
                  ["plans", "Plans"],
                ]}
                value={tab}
                onChange={setTab}
              />
              {tab === "browse" && (
                <>
                  <View style={styles.row}>
                    <Text style={styles.small}>
                      {applied.lat
                        ? "Within " + applied.radius + " km of you"
                        : [applied.area, applied.city]
                            .filter(Boolean)
                            .join(", ") || "All locations"}
                    </Text>
                    <Button
                      title={
                        showFilters ? "Close filters" : "Location & filters"
                      }
                      secondary
                      onPress={() => setShowFilters((v) => !v)}
                    />
                  </View>
                  {showFilters && (
                    <View style={styles.card}>
                      <Button
                        title="◎ Use my location"
                        disabled={busy}
                        onPress={() => void locate()}
                      />
                      {filters.lat ? (
                        <>
                          <Text style={styles.notice}>
                            Your location is selected.
                          </Text>
                          <Choices
                            label="Search radius"
                            options={[
                              ["5", "5 km"],
                              ["10", "10 km"],
                              ["20", "20 km"],
                              ["50", "50 km"],
                            ]}
                            value={filters.radius}
                            onChange={(v) => change("radius", v)}
                          />
                          <Button
                            title="Choose a city instead"
                            secondary
                            onPress={() =>
                              setFilters({ ...filters, lat: "", lng: "" })
                            }
                          />
                        </>
                      ) : (
                        <>
                          <Field
                            label="City"
                            value={filters.city}
                            onChange={(v) => change("city", v)}
                          />
                          <Field
                            label="Area / neighbourhood"
                            value={filters.area}
                            onChange={(v) => change("area", v)}
                          />
                        </>
                      )}
                      <Choices
                        label="Type of help"
                        options={[
                          ["", "All types"],
                          ...CATEGORIES.map(
                            (c) => [c, LABELS[c]] as [string, string],
                          ),
                        ]}
                        value={filters.category}
                        onChange={(v) => change("category", v)}
                      />
                      <Choices
                        label="Work arrangement"
                        options={[
                          ["", "Any"],
                          ["PART_TIME", "Part time"],
                          ["FULL_TIME", "Full time"],
                        ]}
                        value={filters.employmentType}
                        onChange={(v) => change("employmentType", v)}
                      />
                      <Choices
                        label="Daily hours"
                        options={[
                          ["", "Any"],
                          ["2", "Up to 2 h"],
                          ["4", "Up to 4 h"],
                          ["8", "Up to 8 h"],
                          ["12", "Up to 12 h"],
                        ]}
                        value={filters.maxHours}
                        onChange={(v) => change("maxHours", v)}
                      />
                      <Field
                        label="Maximum expected pay (₹)"
                        value={filters.maxPay}
                        onChange={(v) => change("maxPay", v)}
                        keyboardType="number-pad"
                      />
                      <Choices
                        label="Budget period"
                        options={[
                          ["MONTH", "Per month"],
                          ["DAY", "Per day"],
                          ["HOUR", "Per hour"],
                        ]}
                        value={filters.payPeriod}
                        onChange={(v) => change("payPeriod", v)}
                      />
                      <Field
                        label="Skills or name"
                        value={filters.q}
                        onChange={(v) => change("q", v)}
                      />
                      <Button
                        title="Show matching workers"
                        disabled={busy}
                        onPress={() =>
                          void run(async () => {
                            await search(filters);
                            setShowFilters(false);
                          })
                        }
                      />
                      <Button
                        title="Clear filters"
                        secondary
                        onPress={() =>
                          void run(async () => {
                            setFilters({ ...emptyFilters });
                            await search(emptyFilters);
                            setShowFilters(false);
                          })
                        }
                      />
                    </View>
                  )}
                  <Text style={styles.cardTitle}>
                    {result.total} matching profile
                    {result.total === 1 ? "" : "s"}
                  </Text>
                  {result.workers.map(profile)}
                  {ready && result.workers.length === 0 && (
                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>
                        No matching workers yet
                      </Text>
                      <Text style={styles.body}>
                        Try another area, budget or duration. Nearby search
                        includes workers with a pinned location; you can also
                        search by city and area.
                      </Text>
                    </View>
                  )}
                  {result.page > 1 && (
                    <Button
                      title="Previous profiles"
                      secondary
                      disabled={busy}
                      onPress={() =>
                        void run(() => search(applied, result.page - 1))
                      }
                    />
                  )}{" "}
                  {result.page * result.pageSize < result.total && (
                    <Button
                      title="Next profiles →"
                      secondary
                      disabled={busy}
                      onPress={() =>
                        void run(() => search(applied, result.page + 1))
                      }
                    />
                  )}
                </>
              )}
              {tab === "saved" &&
                (account.user ? (
                  <>
                    <Text style={styles.body}>
                      {account.balance} resume credits remaining. Unlocked
                      resumes can be opened again for free.
                    </Text>
                    {unlocked.map(profile)}
                    {unlocked.length === 0 && (
                      <Text style={styles.small}>
                        Your unlocked resumes will appear here.
                      </Text>
                    )}
                  </>
                ) : (
                  login
                ))}
              {tab === "plans" && (
                <>
                  <Text style={styles.body}>
                    1 credit = 1 worker resume. Browse profiles for free; unlock
                    only the resumes you choose.
                  </Text>
                  {packs.map((p) => (
                    <View key={p.id} style={styles.card}>
                      <Text style={styles.cardTitle}>{p.name}</Text>
                      <Text style={styles.pay}>₹{p.priceInr}</Text>
                      <Text style={styles.body}>
                        {p.credits} resume{p.credits === 1 ? "" : "s"} · ₹
                        {Math.round(p.priceInr / p.credits)} each
                      </Text>
                      <Button
                        title="Choose plan on secure checkout"
                        disabled={busy}
                        onPress={() => void checkout()}
                      />
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
        {busy && (
          <View style={styles.loading}>
            <ActivityIndicator color="#204be6" />
          </View>
        )}
      </KeyboardAvoidingView>
      <Modal
        visible={showLogin || Boolean(selected)}
        animationType="slide"
        onRequestClose={() => {
          setShowLogin(false);
          setSelected(null);
        }}
      >
        <SafeAreaView style={styles.modal}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Button
              title="Close ×"
              secondary
              onPress={() => {
                setShowLogin(false);
                setSelected(null);
                setError("");
              }}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            {showLogin
              ? login
              : selected && (
                  <>
                    <Text style={styles.eyebrow}>{showDetails ? "FREE WORKER PROFILE" : "RESUME ACCESS"}</Text>
                    <Text style={styles.title}>{selected.name}</Text>
                    <Text style={styles.body}>
                      {LABELS[selected.category]} ·{" "}
                      {selected.employmentType === "PART_TIME"
                        ? "Part time"
                        : "Full time"}
                    </Text>
                    <Text style={styles.body}>
                      {[selected.area, selected.city]
                        .filter(Boolean)
                        .join(", ")}
                    </Text>
                    {showDetails && [
                      ["Skills", selected.skill],
                      ["About", selected.about],
                      ["Age", selected.age],
                      [
                        "Experience",
                        selected.experienceYears == null
                          ? null
                          : selected.experienceYears + " years",
                      ],
                      [
                        "Daily hours",
                        selected.hoursPerDay == null
                          ? null
                          : selected.hoursPerDay + " h",
                      ],
                      ["Food preferences", selected.vegNonVeg],
                      ["Religion", selected.religion],
                      ["Lives in", selected.livingLocation],
                      ["Work area", selected.workingLocation],
                      ["Can join", selected.whenCanJoin],
                    ]
                      .filter(([, v]) => v != null && v !== "")
                      .map(([label, value]) => (
                        <View key={String(label)} style={styles.field}>
                          <Text style={styles.label}>{label}</Text>
                          <Text style={styles.body}>{value}</Text>
                        </View>
                      ))}
                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>Full resume</Text>
                      {!selected.hasResume ? (
                        <Text style={styles.small}>Resume coming soon.</Text>
                      ) : selected.unlocked ||
                        unlocked.some((w) => w.id === selected.id) ? (
                        <Button
                          title="Open unlocked resume ↗"
                          disabled={busy}
                          onPress={() =>
                            void openResume({ ...selected, unlocked: true })
                          }
                        />
                      ) : (
                        <>
                          <Text style={styles.body}>
                            Choose a plan to unlock this worker’s resume. One
                            credit unlocks one resume; repeat downloads are
                            free.
                          </Text>
                          {account.user && account.balance > 0 ? (
                            <>
                              <Text style={styles.small}>
                                {account.balance} credits available
                              </Text>
                              <Button
                                title="Unlock & open · 1 credit"
                                disabled={busy}
                                onPress={() => void openResume(selected)}
                              />
                            </>
                          ) : (
                            packs.map((p) => (
                              <View key={p.id} style={styles.card}>
                                <Text style={styles.cardTitle}>
                                  {p.name} · ₹{p.priceInr}
                                </Text>
                                <Text style={styles.body}>
                                  {p.credits} full resumes
                                </Text>
                                <Button
                                  title={
                                    account.user
                                      ? "Choose plan"
                                      : "Log in to choose"
                                  }
                                  disabled={busy}
                                  onPress={() =>
                                    account.user
                                      ? void checkout()
                                      : setShowLogin(true)
                                  }
                                />
                              </View>
                            ))
                          )}
                        </>
                      )}
                    </View>
                  </>
                )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
