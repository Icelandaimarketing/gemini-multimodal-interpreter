import { NextResponse } from "next/server";
import { db } from "@/firebase"; // Use root firebase.ts
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// Mock dataset for ingestion
const MOCK_DATASET = [
  { gloss: "HELLO", category: "Greeting", region: "ASL", complexity: "Simple" },
  { gloss: "THANK YOU", category: "Social", region: "ASL", complexity: "Simple" },
  { gloss: "PLEASE", category: "Social", region: "ASL", complexity: "Simple" },
  { gloss: "HELP", category: "Emergency", region: "ASL", complexity: "Medium" },
  { gloss: "EAT", category: "Daily", region: "ASL", complexity: "Simple" },
  { gloss: "DRINK", category: "Daily", region: "ASL", complexity: "Simple" },
  { gloss: "WHERE", category: "Question", region: "ASL", complexity: "Medium" },
  { gloss: "WHO", category: "Question", region: "ASL", complexity: "Medium" },
];

export async function POST(req: Request) {
  try {
    // In a real app, we would verify admin auth here
    
    const results = [];
    const libraryRef = collection(db, "sign-library");

    for (const entry of MOCK_DATASET) {
      const docRef = await addDoc(libraryRef, {
        ...entry,
        ingestedAt: serverTimestamp(),
        source: "OpenSource_Dataset_Alpha",
        status: "verified"
      });
      results.push(docRef.id);
    }

    return NextResponse.json({ 
      success: true, 
      count: results.length,
      message: "Dataset ingestion complete" 
    });
  } catch (error) {
    console.error("Ingestion Error:", error);
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}
