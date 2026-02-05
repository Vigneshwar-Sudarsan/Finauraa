"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "../animated";
import {
  ShieldCheck,
  FileText,
  Clock,
  UserCircleGear,
  Lock,
  Eye,
  Database,
  Bell,
} from "@phosphor-icons/react";

const complianceFeatures = [
  {
    icon: FileText,
    title: "Consent Management",
    description: "Full lifecycle tracking with Tarabut consent IDs, permissions, and audit trail",
  },
  {
    icon: Clock,
    title: "7-Year Audit Logs",
    description: "Every data access logged and retained per BOBF requirements",
  },
  {
    icon: UserCircleGear,
    title: "Data Portability",
    description: "CSV & PDF export for PDPL compliance, user-initiated",
  },
  {
    icon: Lock,
    title: "Data Deletion",
    description: "Full erasure workflow with soft deletes and anonymization",
  },
  {
    icon: Eye,
    title: "Explicit Consent",
    description: "Two-checkbox consent for enhanced AI, revocable anytime",
  },
  {
    icon: Bell,
    title: "Expiry Notifications",
    description: "Automated 7-day advance warnings before consent expiry",
  },
  {
    icon: Database,
    title: "Row Level Security",
    description: "All 21 database tables protected with RLS policies",
  },
  {
    icon: ShieldCheck,
    title: "Input Sanitization",
    description: "Zod validation, prompt injection detection, rate limiting",
  },
];

const frameworks = [
  {
    name: "BOBF",
    fullName: "Bahrain Open Banking Framework",
    status: "Compliant",
    color: "text-emerald-400",
    borderColor: "border-emerald-400/20",
    bgColor: "bg-emerald-400/5",
    items: ["Consent lifecycle", "Audit trail", "Data retention", "Consent expiry automation"],
  },
  {
    name: "PDPL",
    fullName: "Personal Data Protection Law",
    status: "Compliant",
    color: "text-blue-400",
    borderColor: "border-blue-400/20",
    bgColor: "bg-blue-400/5",
    items: ["Data export rights", "Deletion requests", "Purpose limitation", "User consent controls"],
  },
  {
    name: "CBB",
    fullName: "Central Bank of Bahrain",
    status: "Aligned",
    color: "text-violet-400",
    borderColor: "border-violet-400/20",
    bgColor: "bg-violet-400/5",
    items: ["Single regulator model", "Tarabut partnership", "Sandbox eligible", "Clear compliance path"],
  },
];

export function Slide10Compliance() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-start overflow-y-auto px-4 sm:px-12 lg:px-20 py-12 pb-24 sm:py-0 sm:pb-0 sm:justify-center">
      <div className="max-w-6xl w-full">
        <FadeIn>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 max-w-12 bg-emerald-400/50" />
            <span className="text-xs sm:text-sm font-medium text-emerald-400 uppercase tracking-wider">Compliance</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 sm:mb-10">
            Trust is{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">built-in</span>
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Frameworks */}
          <div className="lg:col-span-2 space-y-4">
            <StaggerContainer staggerDelay={0.15}>
              {frameworks.map((fw) => (
                <StaggerItem key={fw.name}>
                  <div className={`rounded-xl border ${fw.borderColor} ${fw.bgColor} p-4 mb-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className={`text-lg font-bold ${fw.color}`}>{fw.name}</span>
                        <p className="text-xs text-zinc-500">{fw.fullName}</p>
                      </div>
                      <span className={`text-xs font-medium ${fw.color} px-2 py-0.5 rounded-full border ${fw.borderColor}`}>
                        {fw.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {fw.items.map((item) => (
                        <div key={item} className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${fw.color.replace("text-", "bg-")}`} />
                          <span className="text-xs text-zinc-400">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>

          {/* Security features */}
          <FadeIn delay={0.4} className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {complianceFeatures.map((f) => (
                <div key={f.title} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <f.icon className="w-5 h-5 text-zinc-400 mb-2" weight="duotone" />
                  <h4 className="text-sm font-semibold text-white mb-1">{f.title}</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
