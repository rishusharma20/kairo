export const SITE_CONFIG = {
  name: "KAIRO",
  tagline: "Your Invisible Intelligence",
  description:
    "Intelligence that never needed another tab. KAIRO is the invisible layer that thinks beside you.",
  url: "https://kairo.ai",
  shortcut: {
    mac: "⌥ + X",
    windows: "Alt + X",
  },
} as const;

export const NAV_LINKS = [
  { label: "Experience", href: "#experience" },
  { label: "Intelligence", href: "#intelligence" },
  { label: "Premium", href: "#premium" },
] as const;

export const DASHBOARD_NAV = [
  { label: "Overview", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "BarChart3" },
  { label: "History", href: "/dashboard/history", icon: "Clock" },
  { label: "Premium", href: "/dashboard/premium", icon: "Crown" },
  { label: "Referrals", href: "/dashboard/referrals", icon: "Users" },
  { label: "Support", href: "/dashboard/support", icon: "HelpCircle" },
  { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
] as const;

export const ADMIN_NAV = [
  { label: "Overview", href: "/admin", icon: "LayoutDashboard" },
  { label: "Users", href: "/admin/users", icon: "Users" },
  { label: "Premium", href: "/admin/premium", icon: "Crown" },
  { label: "API", href: "/admin/api", icon: "Code2" },
  { label: "System", href: "/admin/system", icon: "Activity" },
  { label: "Logs", href: "/admin/logs", icon: "FileText" },
  { label: "Maintenance", href: "/admin/maintenance", icon: "Wrench" },
] as const;

export const PLANS = [
  {
    id: "free",
    name: "Free",
    tagline: "Think Faster.",
    price: 0,
    period: "forever",
    accent: "var(--color-text-muted)",
    features: [
      "50 queries per day",
      "GPT-4o Mini access",
      "Basic code analysis",
      "Standard response time",
      "Community support",
    ],
    limitations: [
      "No advanced models",
      "No priority queue",
      "No API access",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Think Smarter.",
    price: 12,
    period: "month",
    accent: "var(--color-accent)",
    popular: true,
    features: [
      "Unlimited queries",
      "GPT-4o + Claude access",
      "Advanced code analysis",
      "Priority response time",
      "Website analysis",
      "Research summaries",
      "Email support",
      "API access",
    ],
    limitations: ["No custom models"],
  },
  {
    id: "elite",
    name: "Elite",
    tagline: "Think Without Limits.",
    price: 29,
    period: "month",
    accent: "var(--color-accent-gold)",
    features: [
      "Everything in Pro",
      "All AI models",
      "Custom model routing",
      "Instant response time",
      "Advanced analytics",
      "Team collaboration",
      "Priority support",
      "Custom API limits",
      "Early access features",
    ],
    limitations: [],
  },
] as const;

export const SCROLL_JOURNEY_STEPS = [
  { text: "KAIRO", scale: 1.5 },
  { text: "Thinking....", scale: 1 },
  { text: "Analyzing....", scale: 1 },
  { text: "Understanding....", scale: 1 },
  { text: "Generating....", scale: 1 },
  { text: "Still Thinking With You....", scale: 0.9 },
  { text: "Never Left.", scale: 1.2 },
  { text: "Always Beside You.", scale: 1.3 },
] as const;

// Mock data for dashboards
export const MOCK_STATS = {
  user: {
    queriesTotal: 2847,
    queriesToday: 34,
    tokensUsed: 1_250_000,
    streak: 12,
    favoriteModel: "GPT-4o",
    plan: "Pro",
    joinDate: "2024-01-15",
  },
  admin: {
    totalUsers: 12_450,
    activeToday: 3_210,
    totalRevenue: 45_890,
    apiCalls: 1_250_000,
    systemHealth: 99.8,
    avgResponseTime: 1.2,
    errorRate: 0.02,
  },
} as const;

export const MOCK_CHART_DATA = {
  weeklyUsage: [
    { day: "Mon", queries: 45 },
    { day: "Tue", queries: 62 },
    { day: "Wed", queries: 38 },
    { day: "Thu", queries: 71 },
    { day: "Fri", queries: 55 },
    { day: "Sat", queries: 28 },
    { day: "Sun", queries: 34 },
  ],
  modelUsage: [
    { name: "GPT-4o", value: 45, color: "#00D4FF" },
    { name: "Claude", value: 30, color: "#7C3AED" },
    { name: "Gemini", value: 15, color: "#10B981" },
    { name: "GPT-4o Mini", value: 10, color: "#FFB800" },
  ],
  monthlyRevenue: [
    { month: "Jan", revenue: 3200 },
    { month: "Feb", revenue: 4100 },
    { month: "Mar", revenue: 3800 },
    { month: "Apr", revenue: 5200 },
    { month: "May", revenue: 4900 },
    { month: "Jun", revenue: 6100 },
  ],
  dailyActive: [
    { day: "Mon", users: 2800 },
    { day: "Tue", users: 3200 },
    { day: "Wed", users: 2900 },
    { day: "Thu", users: 3500 },
    { day: "Fri", users: 3100 },
    { day: "Sat", users: 1800 },
    { day: "Sun", users: 2100 },
  ],
} as const;

export const MOCK_ACTIVITY = [
  { id: 1, query: "Solve two-sum problem in O(n)", model: "GPT-4o", time: "2 min ago", tokens: 850 },
  { id: 2, query: "Summarize research paper on transformers", model: "Claude", time: "15 min ago", tokens: 1200 },
  { id: 3, query: "Generate STAR answer for leadership question", model: "GPT-4o", time: "1 hr ago", tokens: 620 },
  { id: 4, query: "Analyze website performance metrics", model: "Gemini", time: "2 hr ago", tokens: 950 },
  { id: 5, query: "Explain QuickSort time complexity", model: "GPT-4o Mini", time: "3 hr ago", tokens: 430 },
] as const;

export const MOCK_USERS = [
  { id: 1, name: "Alex Chen", email: "alex@example.com", plan: "Pro", queries: 1250, status: "active", joined: "2024-01-15" },
  { id: 2, name: "Sarah Miller", email: "sarah@example.com", plan: "Elite", queries: 3420, status: "active", joined: "2024-02-20" },
  { id: 3, name: "James Wilson", email: "james@example.com", plan: "Free", queries: 89, status: "active", joined: "2024-03-10" },
  { id: 4, name: "Maya Patel", email: "maya@example.com", plan: "Pro", queries: 2100, status: "suspended", joined: "2024-01-22" },
  { id: 5, name: "Omar Hassan", email: "omar@example.com", plan: "Elite", queries: 4500, status: "active", joined: "2023-12-01" },
  { id: 6, name: "Lisa Park", email: "lisa@example.com", plan: "Free", queries: 45, status: "active", joined: "2024-04-05" },
  { id: 7, name: "David Kim", email: "david@example.com", plan: "Pro", queries: 1800, status: "active", joined: "2024-02-14" },
  { id: 8, name: "Emma Thompson", email: "emma@example.com", plan: "Elite", queries: 5200, status: "active", joined: "2023-11-20" },
] as const;

export const MOCK_LOGS = [
  { id: 1, level: "info", message: "User authentication successful", timestamp: "2024-06-15T10:30:00Z", source: "auth-service" },
  { id: 2, level: "warning", message: "Rate limit approaching for API key ak_***89", timestamp: "2024-06-15T10:28:00Z", source: "api-gateway" },
  { id: 3, level: "error", message: "Failed to connect to model endpoint", timestamp: "2024-06-15T10:25:00Z", source: "model-router" },
  { id: 4, level: "info", message: "Backup completed successfully", timestamp: "2024-06-15T10:20:00Z", source: "backup-service" },
  { id: 5, level: "info", message: "New user registration: user_***42", timestamp: "2024-06-15T10:15:00Z", source: "auth-service" },
  { id: 6, level: "warning", message: "High memory usage detected: 85%", timestamp: "2024-06-15T10:10:00Z", source: "system-monitor" },
  { id: 7, level: "error", message: "Payment processing timeout", timestamp: "2024-06-15T10:05:00Z", source: "billing-service" },
  { id: 8, level: "info", message: "Cache cleared for region us-east-1", timestamp: "2024-06-15T10:00:00Z", source: "cache-service" },
] as const;
