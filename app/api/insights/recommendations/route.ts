import { NextRequest, NextResponse } from "next/server";
import { InsightsEngine } from "@/lib/analytics/insights-engine";

const insightsEngine = new InsightsEngine();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");
    const acknowledged = searchParams.get("acknowledged");
    const timeframe =
      (searchParams.get("timeframe") as "7d" | "30d" | "90d") || "30d";

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID required" },
        { status: 400 },
      );
    }

    const filters: any = { timeframe };

    if (type) filters.type = type;
    if (category) filters.category = category;
    if (priority) filters.priority = priority;
    if (acknowledged !== null) filters.acknowledged = acknowledged === "true";

    const insights = await insightsEngine.getInsights(companyId, filters);

    return NextResponse.json(insights);
  } catch (error) {
    console.error("Error fetching insights:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { companyId, action, insightId, timeframe, acknowledgedBy } =
      await request.json();

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID required" },
        { status: 400 },
      );
    }

    switch (action) {
      case "generate":
        const insights = await insightsEngine.generateInsights(
          companyId,
          timeframe || "30d",
        );
        return NextResponse.json(insights);

      case "acknowledge":
        if (!insightId) {
          return NextResponse.json(
            { error: "Insight ID required" },
            { status: 400 },
          );
        }
        await insightsEngine.acknowledgeInsight(
          insightId,
          acknowledgedBy || "system",
        );
        return NextResponse.json({ success: true });

      case "getStats":
        const stats = await insightsEngine.getInsightStats(companyId);
        return NextResponse.json(stats);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error processing insights action:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
