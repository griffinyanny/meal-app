import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

// The first-run interview (Phase 1E, feature #4). Sits inside the (app) group so
// it inherits the authenticated layout and the phone-form-factor shell, but the
// shell hides the tab bar here — this is a conversation, not a destination you
// navigate away from mid-answer. OnboardGuard sends first-time users here and
// both the completed and skipped paths hand off to /plan.
export default function WelcomePage() {
  return <OnboardingFlow />;
}
