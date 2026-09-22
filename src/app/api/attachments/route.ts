import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { currentAddress } from "@/lib/session";
import {
  getMessageById,
  insertAttachment,
  listAttachmentsForMessages,
} from "@/lib/db/queries";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB per file
const MAX_FIELD = 512; // base64 metadata fields are all tiny

function storageConfigured() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// Upload endpoint for encrypted attachment bytes. The server never sees
// plaintext: it streams opaque bytes to object storage and records only
// metadata (size, mime, and base64 envelopes it cannot open).
export async function POST(request: NextRequest) {
  const address = await currentAddress();
  if (!address) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!storageConfigured()) {
    return NextResponse.json(
      { error: "Attachments are not configured on this server yet." },
      { status: 503 }
    );
  }

  if (!checkRateLimit(`attach:${address}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const messageId = form.get("messageId");
  const file = form.get("file");
  const filenameCt = form.get("filenameCt");
  const filenameNonce = form.get("filenameNonce");
  const wrappedKey = form.get("wrappedKey");
  const wrapNonce = form.get("wrapNonce");
  const mime = form.get("mime");
  const size = form.get("size");

  const strings = { messageId, filenameCt, filenameNonce, wrappedKey, wrapNonce, mime, size };
  for (const [key, value] of Object.entries(strings)) {
    if (typeof value !== "string" || value.length === 0 || value.length > MAX_FIELD) {
      return NextResponse.json({ error: `Invalid field: ${key}.` }, { status: 400 });
    }
  }
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file bytes." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File must be between 1 byte and 5MB." }, { status: 400 });
  }

  // Only the sender uploads (they're the side holding plaintext). This also
  // stops strangers from attaching files to other people's messages.
  const message = await getMessageById(messageId as string);
  if (!message) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }
  if (message.fromAddress.toLowerCase() !== address.toLowerCase()) {
    return NextResponse.json({ error: "Only the sender can attach files." }, { status: 403 });
  }

  let url: string;
  try {
    const blob = await put(`quill/${messageId}/${randomUUID()}.bin`, file, {
      access: "public",
      contentType: "application/octet-stream",
    });
    url = blob.url;
  } catch (err) {
    console.error("[attachments] blob upload failed:", err);
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 502 });
  }

  try {
    const id = await insertAttachment({
      messageId: messageId as string,
      blobUrl: url,
      sizeBytes: String(file.size),
      mime: mime as string,
      filenameCt: filenameCt as string,
      filenameNonce: filenameNonce as string,
      wrappedKey: wrappedKey as string,
      wrapNonce: wrapNonce as string,
    });
    return NextResponse.json({ id, url }, { status: 201 });
  } catch (err) {
    console.error("[attachments] metadata insert failed:", err);
    return NextResponse.json({ error: "Failed to record attachment." }, { status: 500 });
  }
}

// Metadata for messages this viewer can see. Called without messageIds it
// just reports whether storage is configured (so compose knows whether to
// offer the attach button at all).
export async function GET(request: NextRequest) {
  const idsParam = new URL(request.url).searchParams.get("messageIds");
  if (!idsParam) {
    return NextResponse.json({ configured: storageConfigured() });
  }

  const address = await currentAddress();
  if (!address) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 64)
    .slice(0, 50);
  const rows = await listAttachmentsForMessages(ids, address);
  return NextResponse.json({ attachments: rows });
}
