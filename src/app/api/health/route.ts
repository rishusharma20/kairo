import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // Verify database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({ 
      status: "OK", 
      database: "connected", 
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error("Health Check Failed:", error);
    return NextResponse.json({ 
      status: "ERROR", 
      database: "disconnected", 
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
