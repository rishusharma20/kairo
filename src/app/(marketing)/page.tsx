import { HeroSection } from "@/components/landing/hero-section";
import { ScrollJourney } from "@/components/landing/scroll-journey";
import { LiveExperience } from "@/components/landing/live-experience";
import { IntelligenceGrid } from "@/components/landing/intelligence-grid";
import { PricingSection } from "@/components/landing/pricing-section";
import { CTASection } from "@/components/landing/cta-section";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ScrollJourney />
      <LiveExperience />
      <IntelligenceGrid />
      <PricingSection />
      <CTASection />
    </>
  );
}
