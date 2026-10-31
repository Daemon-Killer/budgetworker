import { DirectoryWorkspace } from "../components/DirectoryWorkspace";
import { CustomerApp } from "../components/CustomerApp";
export default function Consumer() {
  if (process.env.EXPO_PUBLIC_APP_VARIANT === "customer") return <CustomerApp />;
  return <DirectoryWorkspace />;
}
