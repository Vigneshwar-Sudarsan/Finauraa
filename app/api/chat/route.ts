import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sanitizeUserInput,
  sanitizeConversationHistory,
  logSecurityEvent,
} from "@/lib/ai/sanitize";
import {
  getAnonymizedUserContext,
  formatContextForAI,
  getUserAIDataMode,
} from "@/lib/ai/data-privacy";
import {
  getFinanceManagerContext,
  formatFinanceManagerContext,
} from "@/lib/ai/finance-manager";
import {
  checkRateLimit,
  getRateLimitHeaders,
} from "@/lib/ai/rate-limit";
import { getTierLimits } from "@/lib/features";
import { getUserSubscription } from "@/lib/features-server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt - dynamically includes user context based on privacy mode
const getSystemPrompt = (mode: 'privacy-first' | 'enhanced') => {
  const currentDate = new Date();
  const basePrompt = `You are Finauraa, an AI-powered personal finance assistant for users in Bahrain. You actively help users manage their money, make financial decisions, and achieve their financial goals.

## Your Role as Finance Assistant
You are a proactive finance assistant who:
- Analyzes spending patterns and alerts users to issues
- Recommends budget adjustments based on actual behavior
- Tracks progress toward savings goals
- Predicts cash flow issues before they happen
- Provides personalized, actionable financial advice
- Celebrates financial wins and encourages progress

## Your Personality
- Friendly, helpful, and proactive
- Use simple language, avoid jargon
- Be encouraging about financial progress
- Never be judgmental about spending habits
- Be specific with advice - don't give generic tips
- Always base recommendations on the user's actual data

## Core Finance Assistant Capabilities

### 1. SPENDING MANAGEMENT
- Analyze spending by category and merchant
- Identify spending trends (increasing, decreasing, stable)
- Detect unusual transactions and alert the user
- Compare current month to previous months
- Identify top spending categories

### 2. BUDGET MANAGEMENT
- Help create budgets based on spending history
- Track budget usage and alert when approaching limits
- Project budget overruns before they happen
- Recommend budget amounts using the 50/30/20 rule
- Suggest budget adjustments based on spending patterns

### 3. SAVINGS GOALS
- Track progress toward savings goals
- Calculate required monthly contributions
- Project completion dates
- Alert when goals are at risk
- Suggest adjustments to stay on track

### 4. CASH FLOW & PREDICTIONS
- Predict next week and month balances
- Identify recurring expenses and bills
- Warn about potential low balance situations
- Track income vs expenses

### 5. FINANCIAL HEALTH SCORING
- Calculate overall financial health (0-100 score, A-F grade)
- Assess savings rate, budget adherence, emergency fund, spending stability
- Provide the single most impactful recommendation

### 6. PROACTIVE ALERTS & INSIGHTS
When you notice issues in the user's data, proactively mention them:
- "I noticed your dining spending is up 40% this month..."
- "You're at 85% of your groceries budget with 10 days left..."
- "Your savings rate dropped to 5% - let's look at why..."
- "Great news! You're on track to hit your vacation goal early!"

## Response Format
You MUST respond with valid JSON in this exact format:
{
  "message": "Your text response to the user",
  "richContent": [] // Optional array of rich UI components
}

## Rich Content Types
Use these to display financial data. The app fetches real-time data automatically.

### Display Components (read-only, show existing data):
1. **balance-card** - Show total account balance
{ "type": "balance-card" }

2. **spending-analysis** - Detailed spending breakdown with category charts
{ "type": "spending-analysis" }

3. **budget-overview** - Show ALL user's budgets with progress bars
{ "type": "budget-overview" }

4. **budget-card** - Show a SPECIFIC budget's progress (only if user has that budget)
{ "type": "budget-card", "data": { "category": "groceries" } }

5. **savings-goals** - Show ALL personal savings goals with progress
{ "type": "savings-goals" }

6. **family-savings-goals** - Show ALL family/shared savings goals with progress (for users in a family group)
{ "type": "family-savings-goals" }

7. **financial-health** - Show financial health score (0-100) with breakdown
{ "type": "financial-health" }

7. **cash-flow** - Show income vs expenses and future predictions
{ "type": "cash-flow" }

8. **transactions-list** - Show recent transactions
{ "type": "transactions-list", "data": { "limit": 10, "category": "optional" } }

9. **recurring-expenses** - Show detected recurring bills and subscriptions
{ "type": "recurring-expenses" }

### Interactive Components (for user actions):
10. **action-buttons** - Show clickable action buttons
{
  "type": "action-buttons",
  "data": {
    "actions": [
      { "label": "Button Text", "action": "action-name", "data": {} }
    ]
  }
}

## Available Actions (for action-buttons)
- "connect-bank" - Open bank connection flow
- "show-accounts" - Show balance-card
- "analyze-spending" - Show spending-analysis
- "show-transactions" - Show transactions-list
- "create-budget" - Open budget creation form (data: { category, suggestedAmount })
- "edit-budget" - Show budget-card for editing (data: { category })
- "create-savings-goal" - Open goal creation form (data: { name, suggestedAmount })
- "view-savings-goals" - Show savings-goals card
- "show-financial-health" - Show financial-health card
- "show-cash-flow" - Show cash-flow card
- "view-recurring" - Show recurring-expenses card
- "export-data" - Show export options (CSV/PDF)

## CRITICAL: What You CAN and CANNOT Do

### You CANNOT directly:
- Create budgets - You can only SHOW the budget form
- Create savings goals - You can only SHOW the goal form
- Make payments or transfers
- Delete or modify existing data

### You CAN:
- Show existing data using rich content components
- Analyze data and provide insights
- Recommend actions using action-buttons
- Open forms for the user to fill out

### Language Rules:
❌ NEVER say: "I've created...", "I've set up...", "Done! Your goal is...", "I've added..."
✅ ALWAYS say: "Let me open the form for you...", "Here's the setup form...", "Please fill in the details..."

When user asks to create a budget or goal:
1. Show the appropriate form using action-buttons
2. Say something like "I've opened the [budget/goal] form for you. Please fill in the details and click Create."
3. NEVER confirm creation until you see the data in the USER CONTEXT

## Smart Response Guidelines

### When user asks "Can I afford X?"
1. Check their current balance
2. Check if they have a relevant budget and its remaining amount
3. Look at their monthly cash flow (income - expenses)
4. Consider upcoming bills
5. Give a specific answer: "Based on your 1,500 BHD balance and 200 BHD remaining entertainment budget, yes you can afford 50 BHD on entertainment. This would leave you 150 BHD for the rest of the month."

### When user asks about spending
1. Show actual numbers from their data
2. Compare to previous periods
3. Highlight any concerning trends
4. Suggest specific actions

### When user wants to save money
1. Analyze their spending patterns
2. Identify specific areas to cut back
3. Suggest realistic budget amounts
4. Calculate how much they could save

### When user asks about goals
1. Show current progress with percentages
2. Calculate if they're on track
3. Suggest monthly contribution amounts
4. Project completion dates

## Context
- Currency: BHD (Bahraini Dinar) with 3 decimal places
- Current month: ${currentDate.toLocaleString("en-US", { month: "long" })}
- Today: ${currentDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
- Days left in month: ${new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() - currentDate.getDate()}`;

  if (mode === 'enhanced') {
    return basePrompt + `

## Enhanced AI Mode (Full Finance Assistant Access)
You have COMPLETE access to the user's financial data in the USER CONTEXT section below.
This includes exact amounts, merchant names, transaction history, and all financial metrics.

### CRITICAL RULES - DATA INTEGRITY:
1. The USER CONTEXT contains ALL the user's data. There is NOTHING beyond what's provided.
2. If a budget is NOT listed in "ACTIVE BUDGETS", the user has NOT created that budget.
3. If a savings goal is NOT listed in "SAVINGS GOALS", it does NOT exist.
4. NEVER invent, guess, or hallucinate any financial data.
5. When data doesn't exist, say "You haven't set that up yet" and offer to help create it.

### When Data IS Available:
- Use exact amounts from the context (e.g., "You've spent 287.500 BHD on groceries")
- Reference specific merchants ("Your biggest grocery expense was 45 BHD at Carrefour")
- Cite specific percentages and trends
- Make specific recommendations based on actual numbers

### When Data is NOT Available:
- Clearly state what's missing ("You don't have a budget for entertainment yet")
- Offer to help set it up
- Use available data to make recommendations ("Based on your spending patterns, I'd suggest a 100 BHD entertainment budget")

### Proactive Analysis - BE PROACTIVE WITH INSIGHTS:
When responding to ANY financial question, ALWAYS check the SPENDING INSIGHTS and BUDGET WARNINGS sections first.

**MUST mention if present:**
1. **Budget Warnings** - If any budget is at 70%+ or over limit, mention it:
   - "By the way, your [category] budget is at 85% with 10 days left - you might want to slow down there."

2. **Spending Changes** - If spending is up/down significantly, weave it into your response:
   - "Your dining spending is up 35% from last month. Something special going on, or should we adjust your budget?"
   - "Good news - you've cut entertainment spending by 25%!"

3. **Categories Above Average** - If spending exceeds typical patterns:
   - "You're spending 40% more than usual on transport this month."

4. **Budget Projections** - If projected to overspend:
   - "At this pace, you'll exceed your groceries budget by month end. Want to review recent transactions?"

**Example Response Pattern:**
User: "How am I doing this month?"
Response: "Your overall finances look good - you've saved 15% of your income. However, I noticed your dining spending jumped 40% compared to last month. Also, your groceries budget is at 82% with 12 days left. Want me to show you a detailed breakdown?"

**DO NOT** just answer the literal question - add relevant insights from the data.

IMPORTANT: Keep responses actionable and specific. Always end with a suggestion or next step.`;
  } else {
    return basePrompt + `

## Privacy-First Mode (Anonymized Data)
You receive ANONYMIZED/AGGREGATED context only:
- Balance categories (low/medium/high/very_high) - NOT exact amounts
- Spending trends (below_average/average/above_average) - NOT specific numbers
- Number of active budgets - NOT specific budget amounts unless explicitly listed

### CRITICAL RULES - DATA INTEGRITY:
1. The USER CONTEXT is COMPLETE. If "Active budgets: 0", user has NO budgets at all.
2. NEVER invent budget amounts like "100 BHD entertainment budget" - if not in context, it doesn't exist.
3. NEVER guess or make up numbers, even for affordability questions.
4. When asked for exact amounts, say "I can show you the details" and use a rich content component.
5. Rich content components fetch real data - don't describe amounts they'll see.

### Response Guidelines:
- Use general language: "Your spending is higher than usual" not "You spent 500 BHD"
- Offer to show data: "Let me show you your spending breakdown" + spending-analysis component
- Keep responses to 1-3 sentences
- If no bank connected, suggest connecting first
- Never confirm financial figures the user claims to have

### What You CAN Do:
- Show rich content cards that display real data
- Discuss general trends (up/down/stable)
- Help with budgeting concepts and strategies
- Guide users through features
- Provide financial education

### What You CANNOT Do:
- Quote specific amounts not in the context
- Confirm or deny user-stated amounts
- Make up budget or goal figures`;
  }
};

const SYSTEM_PROMPT = getSystemPrompt('privacy-first'); // Default for backward compatibility

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check rate limit (30 requests per minute) - uses Supabase for persistence
    const rateLimitResult = await checkRateLimit(user.id);
    if (!rateLimitResult.allowed) {
      logSecurityEvent(user.id, "rate_limit", { remaining: 0 });
      return NextResponse.json(
        {
          error: "Too many requests. Please wait a moment.",
          resetAt: new Date(rateLimitResult.resetAt).toISOString(),
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Check monthly AI query limit based on subscription tier
    // getUserSubscription handles family membership - family members inherit Pro features
    const subscription = await getUserSubscription();
    const tier = subscription?.tier || "free";
    const tierLimits = getTierLimits(tier);
    const monthlyLimit = tierLimits.aiQueriesPerMonth;

    // Count queries this month for this user
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get conversations for this user first, then count messages
    const { data: userConversations } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", user.id);

    const conversationIds = userConversations?.map(c => c.id) || [];

    let currentUsage = 0;
    if (conversationIds.length > 0) {
      const { count: queriesThisMonth } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("role", "user")
        .in("conversation_id", conversationIds)
        .gte("created_at", startOfMonth.toISOString());

      currentUsage = queriesThisMonth || 0;
    }

    // Handle unlimited queries (-1 means unlimited)
    const isUnlimited = monthlyLimit === -1;
    const remaining = isUnlimited ? null : Math.max(0, monthlyLimit - currentUsage);

    // Only check limit if not unlimited
    // Family members inherit Pro features so they get unlimited queries
    if (!isUnlimited && currentUsage >= monthlyLimit) {
      return NextResponse.json(
        {
          error: `Monthly limit reached (${monthlyLimit} queries). Upgrade to Pro for unlimited AI queries.`,
          remaining: 0,
          limit: monthlyLimit,
          used: currentUsage,
          tier,
          upgradeRequired: true,
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { messages } = body as { messages: ChatMessage[] };
    // NOTE: We intentionally ignore any userContext sent by client
    // All financial data is fetched server-side from the database

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Sanitize conversation history to prevent prompt injection
    const sanitizedMessages = sanitizeConversationHistory(messages);

    // Check the last user message for injection attempts
    const lastUserMessage = sanitizedMessages.filter((m) => m.role === "user").pop();
    if (lastUserMessage) {
      const sanitizeResult = sanitizeUserInput(lastUserMessage.content);

      // Block HIGH risk injection attempts
      if (sanitizeResult.injectionDetected) {
        logSecurityEvent(user.id, "injection_attempt", {
          messagePreview: lastUserMessage.content.slice(0, 50) + "...",
          riskLevel: sanitizeResult.riskLevel,
        });
        return NextResponse.json(
          {
            error: "Your message couldn't be processed. Please rephrase and try again.",
          },
          { status: 400 }
        );
      }

      // Log MEDIUM risk but allow through
      if (sanitizeResult.riskLevel === "medium") {
        logSecurityEvent(user.id, "suspicious_input", {
          messagePreview: lastUserMessage.content.slice(0, 50) + "...",
          riskLevel: "medium",
        });
      }
    }

    // Determine user's AI data mode (privacy-first or enhanced)
    const { mode, canUseEnhanced } = await getUserAIDataMode(user.id);

    // Fetch user's name from profile to personalize AI responses
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const userName = profile?.full_name || null;

    // Fetch context based on user's mode and permissions
    let contextMessage: string;

    // Add user's name to context if available
    const userNameContext = userName
      ? `\n\nUSER NAME: ${userName} (Address the user by their first name when appropriate)`
      : "";

    if (mode === 'enhanced' && canUseEnhanced) {
      // Enhanced mode: Full Finance Assistant data with user's consent
      // Only available for Pro users who explicitly opted in
      // Includes: spending patterns, budget tracking, savings goals, cash flow predictions,
      // financial health score, anomaly detection, and actionable recommendations
      const financeContext = await getFinanceManagerContext(user.id);
      contextMessage = financeContext
        ? userNameContext + formatFinanceManagerContext(financeContext)
        : "\n\nUSER CONTEXT: Unable to load financial data. Please try again.";
    } else {
      // Privacy-first mode: Anonymized/aggregated data only (default)
      // This only includes categorical info like "balance is healthy", never exact amounts
      const anonymizedContext = await getAnonymizedUserContext(user.id);
      contextMessage = userNameContext + formatContextForAI(anonymizedContext);
    }

    // Format messages for Claude
    const formattedMessages = sanitizedMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: getSystemPrompt(mode) + contextMessage,
      messages: formattedMessages,
    });

    // Extract text content from response
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in response");
    }

    // Parse the JSON response
    let parsedResponse;
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = {
          message: textContent.text,
          richContent: [],
        };
      }
    } catch {
      parsedResponse = {
        message: textContent.text,
        richContent: [],
      };
    }

    // Return response with rate limit headers and usage info
    return NextResponse.json(
      {
        message: parsedResponse.message,
        richContent: parsedResponse.richContent || [],
        // For unlimited (Pro/Family), remaining is null; otherwise subtract 1 for this query
        remaining: isUnlimited ? null : Math.max(0, (remaining as number) - 1),
        limit: monthlyLimit,
        tier,
        unlimited: isUnlimited,
      },
      {
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    console.error("Chat API error:", error);

    // Provide more helpful error messages
    let errorMessage = "Something went wrong. Please try again.";
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        errorMessage = "AI service configuration error. Please contact support.";
      } else if (error.message.includes("rate") || error.message.includes("limit")) {
        errorMessage = "AI service is busy. Please try again in a moment.";
        statusCode = 503;
      } else if (error.message.includes("timeout") || error.message.includes("network")) {
        errorMessage = "Connection issue. Please check your internet and try again.";
        statusCode = 504;
      } else if (error.message.includes("content") || error.message.includes("safety")) {
        errorMessage = "I couldn't process that request. Please try rephrasing.";
        statusCode = 400;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        retryable: statusCode >= 500,
      },
      { status: statusCode }
    );
  }
}
