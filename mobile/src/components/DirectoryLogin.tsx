import { useState } from "react";
import { Text, View } from "react-native";
import { request, saveToken } from "../lib/api";
import { Field, Button, styles } from "./DirectoryUI";
export function DirectoryLogin({ onDone }: { onDone: () => Promise<void> }) {
  const [phone, setPhone] = useState(""),
    [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [dev, setDev] = useState("");
  async function login() {
    setBusy(true);
    setError("");
    try {
      if (!sent) {
        const d = await request<{ devCode?: string }>(
          "mobile/auth/request",
          "POST",
          { phone },
        );
        setSent(true);
        setDev(d.devCode ?? "");
      } else {
        const d = await request<{ token: string }>(
          "mobile/auth/verify",
          "POST",
          { phone, code, name },
        );
        await saveToken(d.token);
        await onDone();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Your resumes, in one place</Text>
      <Text style={styles.body}>
        Log in to buy a plan and keep the resumes you unlock.
      </Text>
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Field
        label="Mobile number"
        value={phone}
        onChange={(v) => {
          setPhone(v);
          setSent(false);
          setCode("");
        }}
        keyboardType="phone-pad"
      />
      {sent ? (
        <>
          <Field
            label="OTP"
            value={code}
            onChange={setCode}
            keyboardType="number-pad"
          />
          {dev && <Text style={styles.small}>Local demo OTP: {dev}</Text>}
        </>
      ) : (
        <Field label="Your name (optional)" value={name} onChange={setName} />
      )}
      <Button
        title={busy ? "Please wait…" : sent ? "Verify & continue" : "Send OTP"}
        disabled={busy}
        onPress={() => void login()}
      />
      {sent && (
        <Button
          title="Change number / resend"
          secondary
          onPress={() => setSent(false)}
        />
      )}
    </View>
  );
}
