import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId, getToken } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const token = await getToken({ template: "supabase" });

  try {
    // Create a Supabase client with the Clerk session token
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${await getToken({ template: "supabase" })}`,
          },
        },
      }
    );

    // Fetch users from Supabase
    const { data, error } = await supabaseClient.from("users").select(`
    id,
    email,
    name,
    role,
    runs (
      id,
      startDate,
      endDate,
      estimatedA1C,
      notes,
      readings (
        id,
        glucose_value,
        timestamp,
        meal_context
      )
    )
  `);

    if (error) {
      console.error("Error fetching users:", error);
    } else {
      console.log("Fetched users with nested data:", data);
    }

    if (error) {
      console.error("Supabase error:", error);
      return new NextResponse("Failed to fetch users", { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching users:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
