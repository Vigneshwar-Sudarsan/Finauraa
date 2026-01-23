import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/finance/family/spending
 * Fetches aggregated family spending data (category totals only, not transaction details)
 * Requires: Pro subscription, active family group membership, spending consent
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user's subscription tier
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, family_group_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check if user has family features
    // User has family features if they have Pro/Family tier OR are a member of a family group
    // (family members inherit the family tier from the group owner)
    const hasFamilyFeatures =
      profile.subscription_tier === "pro" ||
      profile.subscription_tier === "family" ||
      !!profile.family_group_id; // Family members inherit access
    if (!hasFamilyFeatures) {
      return NextResponse.json(
        { error: "Family features require Pro subscription" },
        { status: 403 }
      );
    }

    // Check if user is in a family group
    if (!profile.family_group_id) {
      return NextResponse.json({
        totalSpending: 0,
        totalIncome: 0,
        currency: "BHD",
        categories: [],
        memberContributions: [],
        noFamilyGroup: true,
      });
    }

    // Get family group details
    const { data: familyGroup } = await supabase
      .from("family_groups")
      .select("id, name, owner_id")
      .eq("id", profile.family_group_id)
      .single();

    if (!familyGroup) {
      return NextResponse.json({ error: "Family group not found" }, { status: 404 });
    }

    // Get all active family members who have given spending consent
    const { data: members } = await supabase
      .from("family_members")
      .select("user_id, role, spending_consent_given")
      .eq("group_id", profile.family_group_id)
      .eq("status", "active");

    if (!members || members.length === 0) {
      return NextResponse.json({
        totalSpending: 0,
        totalIncome: 0,
        currency: "BHD",
        categories: [],
        memberContributions: [],
        noActiveMembers: true,
      });
    }

    // Filter to only members who have given spending consent
    const consentedMembers = members.filter((m) => m.spending_consent_given);

    // Fetch profiles separately to avoid RLS join issues
    const consentedUserIds = consentedMembers.map((m) => m.user_id);
    const { data: memberProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", consentedUserIds);

    if (consentedMembers.length === 0) {
      return NextResponse.json({
        totalSpending: 0,
        totalIncome: 0,
        currency: "BHD",
        categories: [],
        memberContributions: [],
        noConsentedMembers: true,
        message: "No family members have enabled spending sharing yet",
      });
    }

    // Get ALL transactions from all consented members
    // This shows combined family spending (all members' transactions)
    const { data: transactions } = await supabase
      .from("transactions")
      .select("user_id, amount, category, currency, transaction_type, transaction_scope")
      .in("user_id", consentedUserIds)
      .is("deleted_at", null);

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        totalSpending: 0,
        totalIncome: 0,
        currency: "BHD",
        categories: [],
        memberContributions: [],
        familyGroup: { id: familyGroup.id, name: familyGroup.name },
      });
    }

    // Calculate totals
    const debitTransactions = transactions.filter((t) => t.transaction_type === "debit");
    const creditTransactions = transactions.filter((t) => t.transaction_type === "credit");

    const totalSpending = debitTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    const totalIncome = creditTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    // Group spending by category
    const categoryTotals: Record<string, { amount: number; count: number; byMember: Record<string, number> }> = {};

    debitTransactions.forEach((t) => {
      const cat = t.category || "Other";
      if (!categoryTotals[cat]) {
        categoryTotals[cat] = { amount: 0, count: 0, byMember: {} };
      }
      const amount = Math.abs(Number(t.amount));
      categoryTotals[cat].amount += amount;
      categoryTotals[cat].count += 1;

      // Track by member
      if (!categoryTotals[cat].byMember[t.user_id]) {
        categoryTotals[cat].byMember[t.user_id] = 0;
      }
      categoryTotals[cat].byMember[t.user_id] += amount;
    });

    // Create member lookup using the separately fetched profiles
    const profilesMap = new Map(
      (memberProfiles || []).map((p) => [p.id, p])
    );
    const memberLookup: Record<string, { name: string; role: string }> = {};
    consentedMembers.forEach((m) => {
      const memberProfile = profilesMap.get(m.user_id);
      memberLookup[m.user_id] = {
        name: memberProfile?.full_name || memberProfile?.email?.split("@")[0] || "Unknown",
        role: m.role,
      };
    });

    // Build categories with member contributions (percentages only, not amounts)
    const categories = Object.entries(categoryTotals)
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([name, data]) => {
        // Calculate contribution percentages
        const contributions = Object.entries(data.byMember).map(([userId, amount]) => ({
          userId,
          name: memberLookup[userId]?.name || "Unknown",
          percentage: data.amount > 0 ? Math.round((amount / data.amount) * 100) : 0,
        }));

        return {
          id: name.toLowerCase().replace(/\s+/g, "_"),
          name,
          amount: data.amount,
          count: data.count,
          percentage: totalSpending > 0 ? Math.round((data.amount / totalSpending) * 100) : 0,
          contributions,
        };
      });

    // Calculate overall member contributions
    const memberSpending: Record<string, number> = {};
    debitTransactions.forEach((t) => {
      const amount = Math.abs(Number(t.amount));
      if (!memberSpending[t.user_id]) {
        memberSpending[t.user_id] = 0;
      }
      memberSpending[t.user_id] += amount;
    });

    const memberContributions = Object.entries(memberSpending)
      .map(([userId, amount]) => ({
        userId,
        name: memberLookup[userId]?.name || "Unknown",
        role: memberLookup[userId]?.role || "member",
        amount,
        percentage: totalSpending > 0 ? Math.round((amount / totalSpending) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      totalSpending,
      totalIncome,
      currency: transactions[0]?.currency || "BHD",
      categories,
      memberContributions,
      familyGroup: { id: familyGroup.id, name: familyGroup.name },
      memberCount: consentedMembers.length,
    });
  } catch (error) {
    console.error("Failed to fetch family spending:", error);
    return NextResponse.json(
      { error: "Failed to fetch family spending data" },
      { status: 500 }
    );
  }
}
