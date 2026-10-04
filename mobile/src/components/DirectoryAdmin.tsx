import { useCallback, useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { API_URL, getToken, request } from "../lib/api";
import { CATEGORIES, LABELS } from "../../../shared/marketplace";
import { Button, Choices, Field, styles } from "./DirectoryUI";
const empty = {
  name: "",
  phone: "",
  city: "Pune",
  area: "",
  category: "COOK",
  employmentType: "PART_TIME",
  expectedPayInr: "",
  payPeriod: "MONTH",
  hoursPerDay: "",
  age: "",
  experienceYears: "",
  skill: "",
  about: "",
  whenCanJoin: "",
  livingLocation: "",
  workingLocation: "",
  vegNonVeg: "",
  religion: "",
  latitude: "",
  longitude: "",
  status: "AVAILABLE",
  policeVerified: false,
  aadhaarVerified: false,
};
type Draft = typeof empty;
type Worker = {
  id: string;
  name: string;
  city: string;
  area: string;
  category: string;
  status: string;
  resumeFileName: string | null;
  [key: string]: unknown;
};
type Settings = {
  headline: string;
  description: string;
  announcement: string;
  defaultCity: string;
  jobPostingEnabled: boolean;
};
const fields: [
  keyof Omit<Draft, "policeVerified" | "aadhaarVerified">,
  string,
][] = [
  ["name", "Worker name"],
  ["phone", "Phone (private)"],
  ["city", "City"],
  ["area", "Area / neighbourhood"],
  ["expectedPayInr", "Expected pay (₹)"],
  ["hoursPerDay", "Hours per day"],
  ["age", "Age"],
  ["experienceYears", "Years of experience"],
  ["skill", "Skills"],
  ["about", "About"],
  ["whenCanJoin", "Can join from"],
  ["livingLocation", "Lives in"],
  ["workingLocation", "Preferred work area"],
  ["vegNonVeg", "Food preferences"],
  ["religion", "Religion (optional)"],
];
export function DirectoryAdmin() {
  const [workers, setWorkers] = useState<Worker[]>([]),
    [draft, setDraft] = useState<Draft | null>(null),
    [id, setId] = useState<string | null>(null),
    [asset, setAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(
      null,
    ),
    [tab, setTab] = useState("profiles"),
    [settings, setSettings] = useState<Settings | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [places, setPlaces] = useState<
      { label: string; latitude: number; longitude: number }[]
    >([]);
  const load = useCallback(async () => {
    const [w, s] = await Promise.all([
      request<{ workers: Worker[] }>("mobile/admin/workers"),
      request<{ settings: Settings }>("marketplace/settings"),
    ]);
    setWorkers(w.workers);
    setSettings(s.settings);
  }, []);
  useEffect(() => {
    void Promise.resolve()
      .then(load)
      .catch((e) => setError(e.message));
  }, [load]);
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  function edit(w?: Worker) {
    setId(w?.id ?? null);
    setAsset(null);
    setPlaces([]);
    setError("");
    setDraft(
      w
        ? (Object.fromEntries(
            Object.keys(empty).map((k) => [
              k,
              typeof empty[k as keyof Draft] === "boolean"
                ? Boolean(w[k])
                : String(w[k] ?? empty[k as keyof Draft]),
            ]),
          ) as Draft)
        : { ...empty },
    );
  }
  async function pick() {
    const r = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
      ],
      copyToCacheDirectory: true,
    });
    if (!r.canceled) {
      if ((r.assets[0].size ?? 0) > 4 * 1024 * 1024)
        throw Error("Resume must be 4 MB or smaller");
      setAsset(r.assets[0]);
    }
  }
  async function save() {
    if (!draft) return;
    if (!asset && !id) {
      setError("Choose a resume before publishing this profile.");
      return;
    }
    await run(async () => {
      let saved = id;
      if (!saved) {
        const d = await request<{ worker: Worker }>(
          "mobile/admin/workers",
          "POST",
          { ...draft, status: "INACTIVE" },
        );
        saved = d.worker.id;
        setId(saved);
      } else await request("mobile/admin/workers/" + saved, "PATCH", draft);
      if (asset) {
        const form = new FormData();
        if (Platform.OS === "web") {
          if (!asset.file) throw Error("Please choose the file again");
          form.append("file", asset.file);
        } else
          form.append("file", {
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType ?? "application/pdf",
          } as unknown as Blob);
        const token = await getToken();
        const r = await fetch(
          API_URL + "/api/mobile/admin/workers/" + saved + "/resume",
          {
            method: "POST",
            headers: { Authorization: "Bearer " + token },
            body: form,
          },
        );
        const d = await r.json();
        if (!r.ok)
          throw Error(d.error + " Profile is saved; retry uploading here.");
      }
      await request("mobile/admin/workers/" + saved, "PATCH", {
        status: draft.status,
      });
      await load();
      setDraft(null);
      setNotice(
        "Profile and resume saved. Available workers appear in the directory.",
      );
    });
  }
  return (
    <>
      <Choices
        label="Manage"
        options={[
          ["profiles", "Worker profiles"],
          ["content", "Website content"],
        ]}
        value={tab}
        onChange={setTab}
      />
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {notice && <Text style={styles.notice}>{notice}</Text>}
      {tab === "profiles" && (
        <>
          <Button title="+ Add worker" onPress={() => edit()} />
          {draft && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {id ? "Edit worker" : "New worker profile"}
              </Text>
              {fields.map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  value={draft[key]}
                  onChange={(v) =>
                    setDraft({
                      ...draft,
                      [key]: v,
                      ...(key === "city" || key === "area"
                        ? { latitude: "", longitude: "" }
                        : {}),
                    })
                  }
                  multiline={key === "about"}
                  keyboardType={
                    [
                      "expectedPayInr",
                      "hoursPerDay",
                      "age",
                      "experienceYears",
                    ].includes(key)
                      ? "decimal-pad"
                      : key === "phone"
                        ? "phone-pad"
                        : "default"
                  }
                />
              ))}
              <Choices
                label="Type of help"
                options={CATEGORIES.map((c) => [c, LABELS[c]])}
                value={draft.category}
                onChange={(v) => setDraft({ ...draft, category: v })}
              />
              <Choices
                label="Work arrangement"
                options={[
                  ["PART_TIME", "Part time"],
                  ["FULL_TIME", "Full time"],
                ]}
                value={draft.employmentType}
                onChange={(v) => setDraft({ ...draft, employmentType: v })}
              />
              <Choices
                label="Pay period"
                options={[
                  ["MONTH", "Per month"],
                  ["DAY", "Per day"],
                  ["HOUR", "Per hour"],
                ]}
                value={draft.payPeriod}
                onChange={(v) => setDraft({ ...draft, payPeriod: v })}
              />
              <Choices
                label="Directory visibility"
                options={[
                  ["AVAILABLE", "Show profile"],
                  ["INACTIVE", "Draft / hidden"],
                  ["PLACED", "Placed"],
                ]}
                value={draft.status}
                onChange={(v) => setDraft({ ...draft, status: v })}
              />
              <Text style={styles.label}>Location for nearby searches</Text>
              <Button
                title="Find this neighbourhood"
                secondary
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    const d = await request<{
                      places: {
                        label: string;
                        latitude: number;
                        longitude: number;
                      }[];
                    }>(
                      "locations?q=" +
                        encodeURIComponent(
                          [draft.area, draft.city].filter(Boolean).join(", "),
                        ),
                    );
                    setPlaces(d.places);
                    if (!d.places.length)
                      throw Error(
                        "No location found. Try a nearby landmark or more specific area.",
                      );
                  })
                }
              />
              {places.map((p, i) => (
                <Button
                  key={i}
                  title={p.label}
                  secondary
                  onPress={() => {
                    setDraft({
                      ...draft,
                      latitude: String(p.latitude),
                      longitude: String(p.longitude),
                    });
                    setPlaces([]);
                  }}
                />
              ))}
              {draft.latitude && (
                <Text style={styles.notice}>✓ Neighbourhood pinned</Text>
              )}
              <Text style={styles.small}>
                Location data © OpenStreetMap contributors
              </Text>
              <Button
                title={
                  draft.policeVerified
                    ? "✓ Police verified"
                    : "Police verification: not marked"
                }
                secondary
                onPress={() =>
                  setDraft({ ...draft, policeVerified: !draft.policeVerified })
                }
              />
              <Button
                title={
                  draft.aadhaarVerified
                    ? "✓ Aadhaar verified"
                    : "Aadhaar verification: not marked"
                }
                secondary
                onPress={() =>
                  setDraft({
                    ...draft,
                    aadhaarVerified: !draft.aadhaarVerified,
                  })
                }
              />
              <Button
                title={
                  asset
                    ? "Resume: " + asset.name
                    : "Choose resume · PDF / Word / image"
                }
                secondary
                disabled={busy}
                onPress={() => void run(pick)}
              />
              <Text style={styles.small}>
                Up to 4 MB. Existing resume is kept unless you replace it.
              </Text>
              <Button
                title={busy ? "Saving…" : "Save profile & resume"}
                disabled={busy}
                onPress={() => void save()}
              />
              <Button
                title="Cancel"
                secondary
                disabled={busy}
                onPress={() => setDraft(null)}
              />
            </View>
          )}
          {workers.map((w) => (
            <View key={w.id} style={styles.card}>
              <Text style={styles.cardTitle}>{w.name}</Text>
              <Text style={styles.body}>
                {LABELS[w.category]} ·{" "}
                {[w.area, w.city].filter(Boolean).join(", ")}
              </Text>
              <Text style={styles.small}>
                {w.status.toLowerCase()} ·{" "}
                {w.resumeFileName ?? "No resume uploaded"}
              </Text>
              <Button
                title="Edit profile / resume"
                secondary
                onPress={() => edit(w)}
              />
            </View>
          ))}
        </>
      )}
      {tab === "content" && settings && (
        <View style={styles.card}>
          {(
            ["headline", "description", "announcement", "defaultCity"] as const
          ).map((k) => (
            <Field
              key={k}
              label={
                {
                  headline: "Homepage headline",
                  description: "Introduction",
                  announcement: "Announcement",
                  defaultCity: "Default city",
                }[k]
              }
              value={settings[k]}
              onChange={(v) => setSettings({ ...settings, [k]: v })}
              multiline={k === "description"}
            />
          ))}
          <Button
            title="Save website content"
            disabled={busy}
            onPress={() =>
              void run(async () => {
                await request("marketplace/admin/settings", "PATCH", {
                  ...settings,
                  jobPostingEnabled: false,
                });
                setNotice("Website content saved.");
              })
            }
          />
        </View>
      )}
    </>
  );
}
