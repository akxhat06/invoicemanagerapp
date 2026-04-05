import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your Invoice Manager account",
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
