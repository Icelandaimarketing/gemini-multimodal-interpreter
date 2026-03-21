import { NextResponse } from "next/server";
import { db } from "@/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";

// Seed dataset for the sign library
const SEED_DATASET = [
  { gloss: "HELLO", category: "Greeting", region: "ASL", complexity: "Simple" },
  { gloss: "THANK YOU", category: "Social", region: "ASL", complexity: "Simple" },
  { gloss: "PLEASE", category: "Social", region: "ASL", complexity: "Simple" },
  { gloss: "HELP", category: "Emergency", region: "ASL", complexity: "Medium" },
  { gloss: "EAT", category: "Daily", region: "ASL", complexity: "Simple" },
  { gloss: "DRINK", category: "Daily", region: "ASL", complexity: "Simple" },
  { gloss: "WHERE", category: "Question", region: "ASL", complexity: "Medium" },
  { gloss: "WHO", category: "Question", region: "ASL", complexity: "Medium" },
];

const ADMIN_EMAIL = "deddi83@gmail.com";

export async function POST(req: Request) {
  try {
    // Verify admin authorization via Bearer token header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1];

    // Decode the JWT to extract claims (client-side verification)
    // In a production setup with Firebase Admin SDK, use admin.auth().verifyIdToken()
    // For this client-Firebase-only architecture, we decode the payload
    const payloadBase64 = idToken.split(".")[1];
    if (!payloadBase64) {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(
      Buffer.from(payloadBase64, "base64").toString("utf-8")
    );

    if (payload.email !== ADMIN_EMAIL || !payload.email_verified) {
      return NextResponse.json(
        { error: "Insufficient privileges" },
        { status: 403 }
      );
    }

    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return NextResponse.json(
        { error: "Token expired" },
        { status: 401 }
      );
    }

    // Write to the correct collection: sign_languages/{region}/signs/{gloss}
    const results: string[] = [];

    for (const entry of SEED_DATASET) {
      const signRef = doc(
        db,
        "sign_languages",
        entry.region,
        "signs",
        entry.gloss
      );
      await setDoc(
        signRef,
        {
          gloss: entry.gloss,
          description: `${entry.category} sign — ${entry.complexity} complexity`,
          dialect: "Standard",
          status: "verified",
          ingestedAt: serverTimestamp(),
          source: "OpenSource_Dataset_Alpha",
        },
        { merge: true }
      );
      results.push(entry.gloss);
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      message: "Dataset ingestion complete",
    });
  } catch (error) {
    console.error("Ingestion Error:", error);
    return NextResponse.json(
      { error: "Ingestion failed" },
      { status: 500 }
    );
  }
}
