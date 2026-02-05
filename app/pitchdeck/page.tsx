import type { Metadata } from "next";
import { PitchDeck } from "@/components/pitchdeck/pitch-deck";

export const metadata: Metadata = {
  title: "Finauraa - Pitch Deck",
  description: "AI-Powered Personal Finance for Bahrain - Investor Presentation",
  openGraph: {
    title: "Finauraa - Pitch Deck",
    description: "AI-Powered Personal Finance for Bahrain - Investor Presentation",
    type: "website",
  },
};

export default function PitchDeckPage() {
  return <PitchDeck />;
}
