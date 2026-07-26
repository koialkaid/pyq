import "dotenv/config";
import request from "supertest";
import app from "../app";
import { ensureReady } from "../bootstrap";

async function main() {
  await ensureReady();

  const account = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!account || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required.");

  const login = await request(app).post("/api/auth/login").send({ account, password });
  if (login.status !== 200 || !login.body.token) throw new Error(`Login failed (${login.status}).`);

  const authorization = `Bearer ${login.body.token}`;
  const filename = `storage-smoke-${Date.now()}.txt`;
  const content = Buffer.from("pyq storage smoke test");

  const presign = await request(app)
    .post("/api/media/presign")
    .set("Authorization", authorization)
    .send({ filename, mimeType: "application/octet-stream", kind: "file" });
  if (presign.status !== 200 || !presign.body.uploadUrl) {
    throw new Error(`Presign failed (${presign.status}).`);
  }

  const upload = await fetch(presign.body.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream", "x-upsert": "false" },
    body: content,
  });
  if (!upload.ok) throw new Error(`Upload failed (${upload.status}).`);

  const confirm = await request(app)
    .post("/api/media/confirm")
    .set("Authorization", authorization)
    .send({ intentId: presign.body.intentId });
  if (confirm.status !== 201 || !confirm.body.id || !confirm.body.url) {
    throw new Error(`Confirm failed (${confirm.status}).`);
  }

  try {
    const publicRead = await fetch(confirm.body.url);
    if (!publicRead.ok || (await publicRead.text()) !== content.toString()) {
      throw new Error("Public read verification failed.");
    }
  } finally {
    const remove = await request(app)
      .delete(`/api/media/${confirm.body.id}`)
      .set("Authorization", authorization);
    if (remove.status !== 204) throw new Error(`Cleanup failed (${remove.status}).`);
  }

  console.log(`Storage smoke test passed (${confirm.body.storageType}).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
