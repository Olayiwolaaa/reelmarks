import selfsigned from "selfsigned";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";

// Generate a self-signed cert covering localhost + this machine's LAN IPs, so
// an iPhone on the same Wi-Fi can reach https://<laptop-ip>:<port> and (after
// trusting it once) get a secure context — which iOS requires for service
// workers / installable PWAs.

const scriptsDir = fileURLToPath(new URL(".", import.meta.url));
const certDir = join(scriptsDir, "..", "cert");

const ips = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === "IPv4" && !n.internal)
  .map((n) => n.address);

const altNames = [
  { type: 2, value: "localhost" },
  { type: 7, ip: "127.0.0.1" },
  ...ips.map((ip) => ({ type: 7, ip })),
];

const pems = selfsigned.generate([{ name: "commonName", value: ips[0] ?? "localhost" }], {
  days: 825,
  keySize: 2048,
  algorithm: "sha256",
  extensions: [{ name: "subjectAltName", altNames }],
});

await mkdir(certDir, { recursive: true });
await writeFile(join(certDir, "key.pem"), pems.private);
await writeFile(join(certDir, "cert.pem"), pems.cert);

console.log("Wrote cert.pem + key.pem covering:");
for (const host of ["localhost", "127.0.0.1", ...ips]) console.log("  " + host);
console.log("\nAirDrop companion/cert/cert.pem to your iPhone to trust it.");
