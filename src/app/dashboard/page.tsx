import { permanentRedirect } from "next/navigation";

export default function LegacyRedirectPage() {
  permanentRedirect("/market/?market=cn");
}
