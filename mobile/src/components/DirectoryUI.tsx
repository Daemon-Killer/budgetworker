import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";
export function Button({
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
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondary,
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text style={[styles.buttonText, secondary && { color: "#17243c" }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  multiline = false,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[
          styles.input,
          multiline && { minHeight: 90, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}
export function Choices({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: [string, string][];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map(([key, text]) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: key === value }}
            onPress={() => onChange(key)}
            style={[styles.chip, key === value && styles.chipActive]}
          >
            <Text
              style={[
                styles.small,
                key === value && { color: "#204be6", fontWeight: "700" },
              ]}
            >
              {text}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f8fa" },
  header: {
    padding: 18,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#e1e6ef",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brand: {
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.7,
    color: "#17243c",
  },
  content: {
    padding: 20,
    gap: 18,
    paddingBottom: 60,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    fontSize: 31,
    fontWeight: "700",
    letterSpacing: -1,
    lineHeight: 37,
    color: "#17243c",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: "#204be6",
  },
  card: {
    backgroundColor: "white",
    padding: 21,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e1e6ef",
    gap: 13,
  },
  cardTitle: { fontSize: 20, fontWeight: "700", color: "#17243c" },
  body: { fontSize: 14, lineHeight: 23, color: "#4c5c74" },
  small: { fontSize: 12, lineHeight: 19, color: "#64748b" },
  pay: { fontSize: 25, fontWeight: "700", color: "#17243c" },
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: "600", color: "#17243c" },
  input: {
    minHeight: 46,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccd5e3",
    backgroundColor: "white",
    fontSize: 16,
    color: "#17243c",
  },
  button: {
    minHeight: 46,
    padding: 13,
    borderRadius: 12,
    backgroundColor: "#204be6",
    borderWidth: 1,
    borderColor: "#204be6",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 14, fontWeight: "600", color: "white" },
  secondary: { backgroundColor: "white", borderColor: "#e1e6ef" },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e1e6ef",
    backgroundColor: "white",
  },
  chipActive: { backgroundColor: "#eaf0ff", borderColor: "#204be6" },
  error: {
    padding: 14,
    borderRadius: 12,
    color: "#9f233b",
    backgroundColor: "#fff0f2",
    fontSize: 14,
    lineHeight: 21,
  },
  notice: {
    padding: 14,
    borderRadius: 12,
    color: "#116a51",
    backgroundColor: "#eaf9f2",
    fontSize: 13,
    lineHeight: 21,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: "#eaf0ff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 22, fontWeight: "700", color: "#204be6" },
  modal: { flex: 1, backgroundColor: "#f7f8fa" },
  divider: { height: 1, backgroundColor: "#e1e6ef" },
  tag: { color: "#204be6", fontSize: 12, fontWeight: "600" },
  loading: { padding: 14, alignItems: "center" },
});
