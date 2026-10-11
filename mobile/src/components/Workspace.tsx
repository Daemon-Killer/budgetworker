import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import * as DocumentPicker from "expo-document-picker";
import { API_URL, getToken, request, saveToken } from "../lib/api";
import {
  CATEGORIES,
  LABELS,
  PAY_PERIODS,
  payLabel,
  type MeDto,
  type JobDto,
  type ApplicationDto,
} from "../../../shared/marketplace";

type Settings = {
  headline: string;
  description: string;
  announcement: string;
  defaultCity: string;
  jobPostingEnabled: boolean;
};
type AdminWorker = {
  id: string;
  name: string;
  city: string;
  category: string;
  status: string;
  onboardingStatus: string;
  resumeFileName: string | null;
};
const pretty = (s: string) =>
  ({
    APPLIED: "Applied",
    OFFERED: "Offer awaiting acceptance",
    HIRED: "Hired",
    ACTIVE: "Hire in progress",
    COMPLETED: "Completed",
    OPEN: "Open for applications",
    REJECTED: "Declined",
    WITHDRAWN: "Withdrawn",
    CANCELLED: "Cancelled",
  })[s] ?? s.toLowerCase();
function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondary,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>
        {title}
      </Text>
    </Pressable>
  );
}
function Field({
  label,
  value,
  onChange,
  number = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  number?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={number ? "decimal-pad" : "default"}
        multiline={multiline}
        style={[styles.input, multiline && styles.textarea]}
      />
    </View>
  );
}
function Chips({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((c) => (
        <Pressable
          key={c}
          accessibilityRole="button"
          accessibilityState={{ selected: value === c }}
          onPress={() => onChange(c)}
          style={[styles.chip, value === c && styles.chipActive]}
        >
          <Text style={[styles.chipText, value === c && styles.chipTextActive]}>
            {LABELS[c] ?? c.toLowerCase().replaceAll("_", " ")}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
function JobCard({
  job,
  children,
}: {
  job: JobDto;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.tag}>{LABELS[job.category]}</Text>
        <Text style={styles.small}>
          {job.distanceKm != null ? job.distanceKm + " km away" : job.city}
        </Text>
      </View>
      <Text style={styles.cardTitle}>{job.title}</Text>
      <Text style={styles.pay}>{payLabel(job)}</Text>
      <Text style={styles.small}>
        {job.area} ·{" "}
        {job.employmentType === "PART_TIME" ? "Part-time" : "Full-time"}
      </Text>
      <Text style={styles.body}>{job.schedule}</Text>
      <Text style={styles.body}>{job.description}</Text>
      <Text style={styles.small}>{pretty(job.status)}</Text>
      {children}
    </View>
  );
}
const initial = {
  name: "",
  title: "",
  description: "",
  category: "COOK",
  employmentType: "PART_TIME",
  city: "Pune",
  area: "",
  latitude: "",
  longitude: "",
  payInr: "",
  payPeriod: "MONTH",
  schedule: "",
  skill: "",
  about: "",
  salaryExpectation: "",
  experienceYears: "0",
  serviceRadiusKm: "10",
  phone: "",
};

export function Workspace({ mode }: { mode: "consumer" | "worker" | "admin" }) {
  const [me, setMe] = useState<MeDto | null>(null),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [tab, setTab] = useState("home"),
    [phone, setPhone] = useState(""),
    [code, setCode] = useState(""),
    [name, setName] = useState(""),
    [sent, setSent] = useState(false),
    [devCode, setDevCode] = useState(""),
    [form, setForm] = useState<typeof initial>({ ...initial }),
    [formKind, setFormKind] = useState<"job" | "profile" | "adminWorker">(
      "job",
    ),
    [jobs, setJobs] = useState<JobDto[]>([]),
    [nextCursor, setNextCursor] = useState<string | null>(null),
    [city, setCity] = useState("Pune"),
    [category, setCategory] = useState("ALL"),
    [searched, setSearched] = useState(false),
    [selected, setSelected] = useState<{
      job: JobDto;
      applications: ApplicationDto[];
    } | null>(null),
    [messages, setMessages] = useState<Record<string, string>>({}),
    [stars, setStars] = useState("5"),
    [review, setReview] = useState(""),
    [settings, setSettings] = useState<Settings | null>(null),
    [adminWorkers, setAdminWorkers] = useState<AdminWorker[]>([]),
    [adminJobs, setAdminJobs] = useState<(JobDto & { visible: boolean })[]>([]);
  const refresh = useCallback(async () => {
    try {
      if (!(await getToken())) {
        setMe(null);
        return;
      }
      const data = await request<MeDto>("marketplace/me");
      setMe(data);
      if (mode === "worker" && data.worker) setCity(data.worker.city);
      if (mode === "admin" && data.user.role === "ADMIN") {
        const [ws, js, ss] = await Promise.all([
          request<{ workers: AdminWorker[] }>("mobile/admin/workers"),
          request<{ jobs: (JobDto & { visible: boolean })[] }>(
            "marketplace/admin/jobs",
          ),
          request<{ settings: Settings }>("marketplace/settings"),
        ]);
        setAdminWorkers(ws.workers);
        setAdminJobs(js.jobs);
        setSettings(ss.settings);
      }
      return data;
    } catch (e) {
      if (!(await getToken())) setMe(null);
      setError((e as Error).message);
    } finally {
      setReady(true);
    }
  }, [mode]);
  useEffect(() => {
    void Promise.allSettled([
      getToken().then(() => refresh()),
      request<{ settings: Settings }>("marketplace/settings"),
    ]).then(([account, config]) => {
      setCity(
        (account.status === "fulfilled" && account.value?.worker?.city) ||
          (config.status === "fulfilled" && config.value.settings.defaultCity) ||
          "Pune",
      );
    });
  }, [refresh]);
  const change = (k: keyof typeof initial, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to complete this action",
      );
    } finally {
      setBusy(false);
    }
  }
  async function login() {
    await run(async () => {
      if (!sent) {
        const r = await request<{ devCode?: string }>(
          "mobile/auth/request",
          "POST",
          { phone },
        );
        setSent(true);
        setDevCode(r.devCode ?? "");
      } else {
        const r = await request<{ token: string }>(
          "mobile/auth/verify",
          "POST",
          { phone, code, name },
        );
        await saveToken(r.token);
        await refresh();
      }
    });
  }
  async function logout() {
    await run(async () => {
      await request("mobile/auth/logout", "POST", {});
      await saveToken(null);
      setMe(null);
      setSent(false);
      setCode("");
      setTab("home");
    });
  }
  async function action(p: string, body: unknown, message: string) {
    await run(async () => {
      await request("marketplace/" + p, "POST", body);
      await refresh();
      if (selected)
        setSelected(await request("marketplace/jobs/" + selected.job.id));
      setNotice(message);
    });
  }
  function openForm(kind: "job" | "profile" | "adminWorker") {
    setFormKind(kind);
    const w = me?.worker;
    setForm(
      kind === "profile" && w
        ? {
            ...initial,
            name: w.name,
            category: w.category,
            employmentType: w.employmentType,
            city: w.city,
            area: w.area ?? "",
            latitude: w.latitude?.toString() ?? "",
            longitude: w.longitude?.toString() ?? "",
            skill: w.skill ?? "",
            about: w.about ?? "",
            salaryExpectation: w.salaryExpectation ?? "",
            experienceYears: String(w.experienceYears ?? 0),
            serviceRadiusKm: String(w.serviceRadiusKm),
          }
        : { ...initial, city },
    );
    setTab("form");
    setError("");
  }
  async function location() {
    await run(async () => {
      const r = await Location.requestForegroundPermissionsAsync();
      if (r.status !== "granted")
        throw new Error(
          "Location permission was declined. Enter coordinates below or enable location in Settings.",
        );
      const p = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      change("latitude", String(p.coords.latitude));
      change("longitude", String(p.coords.longitude));
      setNotice(
        "Location saved. Only your neighbourhood is displayed publicly.",
      );
    });
  }
  async function submit() {
    await run(async () => {
      if (
        formKind !== "adminWorker" &&
        (!form.latitude.trim() || !form.longitude.trim())
      )
        throw new Error(
          "Add the work location using the location button or coordinates.",
        );
      const base = {
        category: form.category,
        employmentType: form.employmentType,
        city: form.city,
        area: form.area,
      };
      if (formKind === "job")
        await request("marketplace/jobs", "POST", {
          ...base,
          title: form.title,
          description: form.description,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          payInr: Number(form.payInr),
          payPeriod: form.payPeriod,
          schedule: form.schedule,
        });
      else if (formKind === "profile")
        await request("marketplace/worker", "PUT", {
          ...base,
          name: form.name,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          skill: form.skill,
          about: form.about,
          salaryExpectation: form.salaryExpectation,
          experienceYears: Number(form.experienceYears),
          serviceRadiusKm: Number(form.serviceRadiusKm),
        });
      else
        await request("mobile/admin/workers", "POST", {
          ...base,
          name: form.name,
          phone: form.phone,
          skill: form.skill,
          about: form.about,
          salaryExpectation: form.salaryExpectation,
          experienceYears: Number(form.experienceYears),
          status: "AVAILABLE",
        });
      setTab("home");
      await refresh();
      setNotice(formKind === "job" ? "Your job is live." : "Profile saved.");
    });
  }
  async function browse(cursor?: string) {
    await run(async () => {
      const q = new URLSearchParams({ city });
      if (category !== "ALL") q.set("category", category);
      const w = me?.worker;
      if (w?.latitude != null && w.longitude != null) {
        q.set("lat", String(w.latitude));
        q.set("lng", String(w.longitude));
        q.set("radius", String(w.serviceRadiusKm));
      }
      if (cursor) q.set("cursor", cursor);
      const r = await request<{ jobs: JobDto[]; nextCursor: string | null }>(
        "marketplace/jobs?" + q,
      );
      setJobs((old) => (cursor ? [...old, ...r.jobs] : r.jobs));
      setNextCursor(r.nextCursor);
      setSearched(true);
    });
  }
  async function manage(id: string) {
    await run(async () => {
      setSelected(await request("marketplace/jobs/" + id));
      setTab("manage");
    });
  }
  async function patch(p: string, body: unknown) {
    await run(async () => {
      await request("marketplace/admin/" + p, "PATCH", body);
      await refresh();
      setNotice("Saved.");
    });
  }
  async function upload(workerId: string) {
    await run(async () => {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "image/jpeg",
          "image/png",
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if ((file.size ?? 0) > 4 * 1024 * 1024)
        throw new Error("Choose a file under 4 MB.");
      const body = new FormData();
      if (Platform.OS === "web" && file.file) body.append("file", file.file);
      else
        body.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType ?? "application/pdf",
        } as unknown as Blob);
      const token = await getToken();
      const res = await fetch(
        API_URL + "/api/mobile/admin/workers/" + workerId + "/resume",
        { method: "POST", headers: { Authorization: "Bearer " + token }, body },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      await refresh();
      setNotice("Resume uploaded.");
    });
  }
  function cancel(id: string) {
    const doCancel = () =>
      void action(
        "jobs/" + id + "/status",
        { action: "cancel" },
        "Job cancelled.",
      );
    if (Platform.OS === "web") {
      if (confirm("Cancel this job and its applications?")) doCancel();
    } else
      Alert.alert("Cancel job?", "This closes the job and its applications.", [
        { text: "Keep job", style: "cancel" },
        { text: "Cancel job", style: "destructive", onPress: doCancel },
      ]);
  }
  const field = (
    k: keyof typeof initial,
    label: string,
    number = false,
    multiline = false,
  ) => (
    <Field
      key={k}
      label={label}
      value={form[k]}
      onChange={(v) => change(k, v)}
      number={number}
      multiline={multiline}
    />
  );
  if (!ready)
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color="#204be6" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>B. budgetworker</Text>
          {me && (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void logout()}
            >
              <Text style={styles.small}>Log out everywhere</Text>
            </Pressable>
          )}
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void refresh().finally(() => setRefreshing(false));
              }}
            />
          }
        >
          <View style={styles.modeRow}>
            {[
              ["consumer", "Find help"],
              ["worker", "Find work"],
              ...(me?.user.role === "ADMIN" ? [["admin", "Admin"]] : []),
            ].map(([key, label]) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: mode === key }}
                key={key}
                onPress={() =>
                  router.replace(
                    key === "consumer"
                      ? "/consumer"
                      : key === "worker"
                        ? "/worker"
                        : "/admin",
                  )
                }
                style={[styles.mode, mode === key && styles.modeActive]}
              >
                <Text
                  style={[
                    styles.modeText,
                    mode === key && styles.modeTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {!me ? (
            <View style={styles.card}>
              <Text style={styles.eyebrow}>
                {mode === "worker"
                  ? "GOOD WORK, CLOSE TO HOME"
                  : "YOUR HOME, YOUR CHOICE"}
              </Text>
              <Text style={styles.title}>
                {mode === "worker"
                  ? "Find work that fits your day."
                  : "The right help starts here."}
              </Text>
              <Text style={styles.body}>
                Continue with your mobile number to{" "}
                {mode === "worker"
                  ? "create a profile and apply to nearby offers"
                  : "post a job and meet local workers"}
                .
              </Text>
              {!sent ? (
                <>
                  <Field
                    label="Mobile number"
                    value={phone}
                    onChange={setPhone}
                    number
                  />
                  <Field
                    label="Your name (optional)"
                    value={name}
                    onChange={setName}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.small}>Code sent to {phone}</Text>
                  {devCode ? (
                    <Text style={styles.notice}>
                      Development OTP: {devCode}
                    </Text>
                  ) : null}
                  <Field
                    label="One-time code"
                    value={code}
                    onChange={setCode}
                    number
                  />
                  <Button
                    title="Change number"
                    secondary
                    onPress={() => setSent(false)}
                    disabled={busy}
                  />
                </>
              )}
              <Button
                title={
                  busy
                    ? "Please wait…"
                    : sent
                      ? "Verify and continue"
                      : "Send code"
                }
                onPress={() => void login()}
                disabled={busy}
              />
            </View>
          ) : mode === "admin" && me.user.role !== "ADMIN" ? (
            <Text style={styles.error}>This account has no admin access.</Text>
          ) : (
            <>
              <Text style={styles.eyebrow}>
                {mode === "worker"
                  ? "WORKER WORKSPACE"
                  : mode === "admin"
                    ? "ADMIN CONSOLE"
                    : "FAMILY WORKSPACE"}
              </Text>
              <Text style={styles.title}>
                Hello, {me.user.name ?? me.worker?.name ?? "there"}.
              </Text>
              <View style={styles.chips}>
                {(mode === "consumer"
                  ? [["home", "My jobs"]]
                  : mode === "worker"
                    ? [
                        ["home", "Overview"],
                        ["offers", "Nearby offers"],
                        ["applications", "Applications"],
                      ]
                    : [
                        ["home", "Workers"],
                        ["settings", "Website"],
                        ["jobs", "Jobs"],
                      ]
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    title={label}
                    secondary={tab !== key}
                    onPress={() => {
                      setTab(key);
                      setError("");
                      setNotice("");
                    }}
                    disabled={busy}
                  />
                ))}
              </View>
              {tab === "form" ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>
                    {formKind === "job"
                      ? "Post a job"
                      : formKind === "profile"
                        ? "Your work profile"
                        : "Add worker"}
                  </Text>
                  {formKind === "job"
                    ? field("title", "Job title")
                    : field("name", "Worker name")}
                  {formKind === "adminWorker" &&
                    field("phone", "Worker mobile number", true)}
                  <Text style={styles.label}>Service</Text>
                  <Chips
                    options={CATEGORIES}
                    value={form.category}
                    onChange={(v) => change("category", v)}
                  />
                  <Text style={styles.label}>Working arrangement</Text>
                  <Chips
                    options={["PART_TIME", "FULL_TIME"]}
                    value={form.employmentType}
                    onChange={(v) => change("employmentType", v)}
                  />
                  {field("city", "City")}
                  {field("area", "Neighbourhood")}
                  {formKind === "job" ? (
                    <>
                      {field("payInr", "Offered pay (₹)", true)}
                      <Text style={styles.label}>Pay frequency</Text>
                      <Chips
                        options={PAY_PERIODS}
                        value={form.payPeriod}
                        onChange={(v) => change("payPeriod", v)}
                      />
                      {field("schedule", "Days and hours")}
                      {field(
                        "description",
                        "Describe the work (20+ characters)",
                        false,
                        true,
                      )}
                    </>
                  ) : (
                    <>
                      {field("skill", "Skills")}
                      {field("about", "About you", false, true)}
                      {field("salaryExpectation", "Expected pay")}
                      {field("experienceYears", "Years of experience", true)}
                      {formKind === "profile" &&
                        field(
                          "serviceRadiusKm",
                          "Travel radius in km (1–50)",
                          true,
                        )}
                    </>
                  )}
                  {formKind !== "adminWorker" && (
                    <>
                      <Button
                        title="Use my current location"
                        secondary
                        disabled={busy}
                        onPress={() => void location()}
                      />
                      <Text style={styles.small}>
                        Use the place where the work happens. Only your
                        neighbourhood is displayed publicly.
                      </Text>
                      {field("latitude", "Latitude", true)}
                      {field("longitude", "Longitude", true)}
                    </>
                  )}
                  <Button
                    title={
                      busy
                        ? "Saving…"
                        : formKind === "job"
                          ? "Post job"
                          : "Save profile"
                    }
                    disabled={busy}
                    onPress={() => void submit()}
                  />
                  <Button
                    title="Back"
                    secondary
                    onPress={() => setTab("home")}
                  />
                </View>
              ) : null}
              {mode === "consumer" && tab === "home" && (
                <>
                  <Button
                    title="+ Post a job"
                    disabled={busy}
                    onPress={() => openForm("job")}
                  />
                  <Text style={styles.body}>
                    Post clear pay and hours. Interested workers apply; you
                    choose together.
                  </Text>
                  {me.jobs.length === 0 ? (
                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>
                        Your first hire starts here
                      </Text>
                      <Text style={styles.body}>
                        Tell nearby workers what your home needs.
                      </Text>
                    </View>
                  ) : (
                    me.jobs.map((j) => (
                      <JobCard key={j.id} job={j}>
                        <Button
                          title={"View " + j.applicationCount + " applications"}
                          secondary
                          disabled={busy}
                          onPress={() => void manage(j.id)}
                        />
                      </JobCard>
                    ))
                  )}
                </>
              )}
              {mode === "consumer" && tab === "manage" && selected && (
                <>
                  <JobCard job={selected.job}>
                    {selected.job.status === "ACTIVE" && (
                      <Button
                        title="Mark completed"
                        disabled={busy}
                        onPress={() =>
                          void action(
                            "jobs/" + selected.job.id + "/status",
                            { action: "complete" },
                            "Hire completed. You can leave a rating.",
                          )
                        }
                      />
                    )}{" "}
                    {!["COMPLETED", "CANCELLED"].includes(
                      selected.job.status,
                    ) && (
                      <Button
                        title="Cancel job"
                        secondary
                        disabled={busy}
                        onPress={() => cancel(selected.job.id)}
                      />
                    )}
                  </JobCard>
                  {selected.job.status === "COMPLETED" &&
                    !selected.job.hasReviewed && (
                      <View style={styles.card}>
                        <Text style={styles.cardTitle}>How did it go?</Text>
                        <Chips
                          options={["5", "4", "3", "2", "1"]}
                          value={stars}
                          onChange={setStars}
                        />
                        <Field
                          label="Review"
                          value={review}
                          onChange={setReview}
                          multiline
                        />
                        <Button
                          title="Submit rating"
                          disabled={busy}
                          onPress={() =>
                            void action(
                              "jobs/" + selected.job.id + "/review",
                              { stars: Number(stars), comment: review },
                              "Rating saved.",
                            )
                          }
                        />
                      </View>
                    )}
                  <Text style={styles.cardTitle}>Applications</Text>
                  {selected.applications.length === 0 && (
                    <Text style={styles.body}>No applications yet.</Text>
                  )}
                  {selected.applications.map((a) => (
                    <View key={a.id} style={styles.card}>
                      <Text style={styles.cardTitle}>{a.worker.name}</Text>
                      <Text style={styles.small}>
                        {a.worker.area}, {a.worker.city} ·{" "}
                        {a.worker.experienceYears ?? 0} years’ experience
                      </Text>
                      <Text style={styles.body}>{a.worker.skill}</Text>
                      <Text style={styles.body}>
                        {a.worker.rating
                          ? "★ " +
                            a.worker.rating +
                            " · " +
                            a.worker.reviewCount +
                            " reviews"
                          : "No ratings yet"}
                      </Text>
                      <Text style={styles.body}>{a.message}</Text>
                      <Text style={styles.tag}>{pretty(a.status)}</Text>
                      {a.contactPhone && (
                        <Button
                          title="Call worker"
                          secondary
                          onPress={() =>
                            void Linking.openURL("tel:" + a.contactPhone)
                          }
                        />
                      )}{" "}
                      {a.status === "APPLIED" &&
                        selected.job.status === "OPEN" && (
                          <Button
                            title="Offer this job"
                            disabled={busy}
                            onPress={() =>
                              void action(
                                "applications/" + a.id + "/status",
                                { action: "offer" },
                                "Offer sent. Contacts are shared after acceptance.",
                              )
                            }
                          />
                        )}{" "}
                      {["APPLIED", "OFFERED"].includes(a.status) && (
                        <Button
                          title="Decline"
                          secondary
                          disabled={busy}
                          onPress={() =>
                            void action(
                              "applications/" + a.id + "/status",
                              { action: "reject" },
                              "Application declined.",
                            )
                          }
                        />
                      )}
                    </View>
                  ))}
                </>
              )}
              {mode === "worker" && tab === "home" && (
                <>
                  <View style={styles.stats}>
                    <View>
                      <Text style={styles.stat}>
                        {me.worker?.rating ?? "—"}
                      </Text>
                      <Text style={styles.small}>
                        {me.worker?.reviewCount ?? 0} ratings
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.stat}>
                        {
                          me.applications.filter((a) => a.status === "OFFERED")
                            .length
                        }
                      </Text>
                      <Text style={styles.small}>New offers</Text>
                    </View>
                    <View>
                      <Text style={styles.stat}>
                        {
                          me.applications.filter((a) => a.status === "HIRED")
                            .length
                        }
                      </Text>
                      <Text style={styles.small}>Active hires</Text>
                    </View>
                  </View>
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                      {me.worker?.name ?? "Create your work profile"}
                    </Text>
                    <Text style={styles.body}>
                      {me.worker
                        ? LABELS[me.worker.category] +
                          " · " +
                          me.worker.area +
                          ", " +
                          me.worker.city
                        : "Add your skills, expected pay and the area you can travel to."}
                    </Text>
                    {me.worker && (
                      <Text style={styles.notice}>
                        {me.worker.onboardingStatus === "PENDING"
                          ? "Waiting for team approval."
                          : me.worker.onboardingStatus === "APPROVED"
                            ? "Approved · " +
                              me.worker.serviceRadiusKm +
                              " km travel radius"
                            : "Profile needs team review."}
                      </Text>
                    )}
                    <Button
                      title={
                        me.worker ? "Edit my profile" : "Create my profile"
                      }
                      secondary
                      onPress={() => openForm("profile")}
                    />
                  </View>
                  <Text style={styles.cardTitle}>Your reviews</Text>
                  {me.reviews.length ? (
                    me.reviews.map((r) => (
                      <View style={styles.card} key={r.id}>
                        <Text style={styles.pay}>{"★".repeat(r.stars)}</Text>
                        <Text style={styles.body}>
                          {r.comment || "Rating from a completed hire"}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.body}>
                      Reviews appear after a family completes a hire and rates
                      your work.
                    </Text>
                  )}
                </>
              )}
              {mode === "worker" && tab === "offers" && (
                <>
                  <Field label="City" value={city} onChange={setCity} />
                  <Chips
                    options={["ALL", ...CATEGORIES]}
                    value={category}
                    onChange={setCategory}
                  />
                  <Text style={styles.small}>
                    {me.worker?.latitude != null
                      ? "Within " +
                        me.worker.serviceRadiusKm +
                        " km of your profile location"
                      : "Add your location to see distance-filtered offers"}
                  </Text>
                  <Button
                    title="Find nearby offers"
                    disabled={busy}
                    onPress={() => void browse()}
                  />
                  {searched && jobs.length === 0 && (
                    <Text style={styles.body}>
                      No matching offers. Try another service or adjust your
                      travel radius.
                    </Text>
                  )}
                  {jobs.map((j) => {
                    const a = me.applications.find((a) => a.job.id === j.id);
                    return (
                      <JobCard key={j.id} job={j}>
                        {a ? (
                          <Text style={styles.tag}>{pretty(a.status)}</Text>
                        ) : (
                          <>
                            <Field
                              label="Introduce yourself"
                              value={messages[j.id] ?? ""}
                              onChange={(v) =>
                                setMessages((old) => ({ ...old, [j.id]: v }))
                              }
                            />
                            <Button
                              title="Apply to this job"
                              disabled={
                                busy ||
                                !me.worker ||
                                me.worker.onboardingStatus !== "APPROVED" ||
                                me.worker.status !== "AVAILABLE"
                              }
                              onPress={() =>
                                void action(
                                  "jobs/" + j.id + "/apply",
                                  { message: messages[j.id] ?? "" },
                                  "Application sent.",
                                )
                              }
                            />
                          </>
                        )}
                      </JobCard>
                    );
                  })}
                  {nextCursor && (
                    <Button
                      title="Load more"
                      secondary
                      disabled={busy}
                      onPress={() => void browse(nextCursor)}
                    />
                  )}
                </>
              )}
              {mode === "worker" && tab === "applications" && (
                <>
                  {me.applications.length === 0 && (
                    <Text style={styles.body}>
                      No applications yet. Find a nearby offer to get started.
                    </Text>
                  )}
                  {me.applications.map((a) => (
                    <JobCard key={a.id} job={a.job}>
                      <Text style={styles.tag}>{pretty(a.status)}</Text>
                      {a.contactPhone && (
                        <Button
                          title="Call family"
                          secondary
                          onPress={() =>
                            void Linking.openURL("tel:" + a.contactPhone)
                          }
                        />
                      )}{" "}
                      {a.status === "OFFERED" && (
                        <Button
                          title="Accept offer"
                          disabled={busy}
                          onPress={() =>
                            void action(
                              "applications/" + a.id + "/status",
                              { action: "accept" },
                              "Offer accepted. You can contact the family.",
                            )
                          }
                        />
                      )}{" "}
                      {["APPLIED", "OFFERED"].includes(a.status) && (
                        <Button
                          title="Withdraw"
                          secondary
                          disabled={busy}
                          onPress={() =>
                            void action(
                              "applications/" + a.id + "/status",
                              { action: "withdraw" },
                              "Application withdrawn.",
                            )
                          }
                        />
                      )}
                    </JobCard>
                  ))}
                </>
              )}
              {mode === "admin" && tab === "home" && (
                <>
                  <Button
                    title="+ Add worker"
                    disabled={busy}
                    onPress={() => openForm("adminWorker")}
                  />
                  {adminWorkers.map((w) => (
                    <View key={w.id} style={styles.card}>
                      <Text style={styles.cardTitle}>{w.name}</Text>
                      <Text style={styles.small}>
                        {LABELS[w.category]} · {w.city} ·{" "}
                        {w.onboardingStatus.toLowerCase()}
                      </Text>
                      <Text style={styles.body}>
                        {w.resumeFileName ?? "No resume uploaded"}
                      </Text>
                      <Button
                        title="Upload resume"
                        secondary
                        disabled={busy}
                        onPress={() => void upload(w.id)}
                      />
                      {w.onboardingStatus !== "APPROVED" && (
                        <Button
                          title="Approve profile"
                          disabled={busy}
                          onPress={() =>
                            void patch("workers/" + w.id, { approved: true })
                          }
                        />
                      )}
                      <Button
                        title={
                          w.onboardingStatus === "APPROVED"
                            ? "Suspend profile"
                            : "Reject profile"
                        }
                        secondary
                        disabled={busy}
                        onPress={() =>
                          void patch("workers/" + w.id, { approved: false })
                        }
                      />
                    </View>
                  ))}
                </>
              )}
              {mode === "admin" && tab === "settings" && settings && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Website content</Text>
                  {(
                    [
                      "headline",
                      "description",
                      "announcement",
                      "defaultCity",
                    ] as const
                  ).map((k) => (
                    <Field
                      key={k}
                      label={k === "defaultCity" ? "Default city" : k}
                      value={settings[k]}
                      onChange={(v) =>
                        setSettings((s) => (s ? { ...s, [k]: v } : s))
                      }
                      multiline={k === "description"}
                    />
                  ))}
                  <Button
                    title={
                      settings.jobPostingEnabled
                        ? "New jobs allowed · tap to pause"
                        : "New jobs paused · tap to allow"
                    }
                    secondary
                    onPress={() =>
                      setSettings((s) =>
                        s
                          ? { ...s, jobPostingEnabled: !s.jobPostingEnabled }
                          : s,
                      )
                    }
                  />
                  <Button
                    title="Save website settings"
                    disabled={busy}
                    onPress={() =>
                      void patch("settings", {
                        headline: settings.headline,
                        description: settings.description,
                        announcement: settings.announcement,
                        defaultCity: settings.defaultCity,
                        jobPostingEnabled: settings.jobPostingEnabled,
                      })
                    }
                  />
                </View>
              )}
              {mode === "admin" &&
                tab === "jobs" &&
                adminJobs.map((j) => (
                  <JobCard key={j.id} job={j}>
                    <Button
                      title={j.visible ? "Hide offer" : "Restore offer"}
                      secondary
                      disabled={busy}
                      onPress={() =>
                        void patch("jobs/" + j.id, { visible: !j.visible })
                      }
                    />
                  </JobCard>
                ))}
            </>
          )}
        </ScrollView>
        {busy && (
          <View style={styles.loading}>
            <ActivityIndicator color="#204be6" />
            <Text style={styles.small}>Please wait…</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f8fa" },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#e1e6ef",
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  brand: {
    fontSize: 20,
    fontWeight: "800",
    color: "#17243c",
    letterSpacing: -0.5,
  },
  content: {
    padding: 20,
    gap: 18,
    paddingBottom: 50,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  modeRow: { flexDirection: "row", gap: 8 },
  mode: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 30,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e1e6ef",
  },
  modeActive: { backgroundColor: "#eaf0ff", borderColor: "#c9d6ff" },
  modeText: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  modeTextActive: { color: "#204be6" },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#204be6",
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
    letterSpacing: -1,
    color: "#17243c",
  },
  card: {
    padding: 21,
    gap: 15,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e1e6ef",
    borderRadius: 20,
  },
  cardTitle: { fontSize: 20, fontWeight: "700", color: "#17243c" },
  pay: { fontSize: 24, fontWeight: "700", color: "#17243c" },
  body: { fontSize: 14, lineHeight: 23, color: "#4c5c74" },
  small: { fontSize: 12, lineHeight: 19, color: "#64748b" },
  label: { fontSize: 13, fontWeight: "600", color: "#17243c" },
  field: { gap: 7 },
  input: {
    borderWidth: 1,
    borderColor: "#ccd5e3",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 13,
    minHeight: 46,
    fontSize: 16,
    color: "#17243c",
  },
  textarea: { minHeight: 100, textAlignVertical: "top" },
  button: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#204be6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#204be6",
  },
  buttonText: { fontSize: 14, fontWeight: "600", color: "white" },
  secondary: { backgroundColor: "white", borderColor: "#e1e6ef" },
  secondaryText: { color: "#17243c" },
  disabled: { opacity: 0.45 },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#e1e6ef",
    backgroundColor: "white",
  },
  chipActive: { backgroundColor: "#eaf0ff", borderColor: "#204be6" },
  chipText: { fontSize: 12, color: "#64748b" },
  chipTextActive: { color: "#204be6", fontWeight: "700" },
  tag: { fontSize: 12, color: "#204be6", fontWeight: "600" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  error: {
    fontSize: 14,
    lineHeight: 21,
    color: "#9f233b",
    backgroundColor: "#fff0f2",
    borderRadius: 12,
    padding: 14,
  },
  notice: {
    fontSize: 13,
    lineHeight: 21,
    color: "#116a51",
    backgroundColor: "#eaf9f2",
    borderRadius: 12,
    padding: 14,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 22,
    backgroundColor: "white",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e1e6ef",
  },
  stat: { fontSize: 28, fontWeight: "700", color: "#17243c" },
  loading: {
    position: "absolute",
    bottom: 10,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#fffffff5",
    borderRadius: 12,
  },
});
