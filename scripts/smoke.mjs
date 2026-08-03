// SPDX-License-Identifier: Apache-2.0
// Managed-path smoke: the public SDK connects to the stack, executes the AGDX
// hello, and round-trips a managed KV set/get through Iggy, the UDS sidecar,
// and laser-plane. Container health alone cannot prove that path, this can.
import { Laser } from "@laserdata/laser-sdk"

const connection = process.env.LASER_CONNECTION_STRING
if (!connection) {
  console.error("LASER_CONNECTION_STRING is required")
  process.exit(1)
}

const laser = await Laser.connectWithStream(connection, "laser-smoke")
try {
  const capabilities = await laser.capabilities()
  if (!capabilities.managed) {
    throw new Error("the AGDX hello did not advertise a ready managed backend")
  }
  if (!capabilities.kv.available) {
    throw new Error("the managed backend does not advertise KV")
  }
  const opsStream = capabilities.topology?.opsStream ?? "(default)"
  console.log(`AGDX hello passed: managed backend ready, ops stream ${opsStream}`)

  const kv = laser.kv("laser-smoke")
  const key = new TextEncoder().encode(`smoke-${String(Date.now())}`)
  await kv.set(key).bytes(new TextEncoder().encode("ok")).send()
  const value = await kv.get(key)
  if (value === undefined || new TextDecoder().decode(value) !== "ok") {
    throw new Error("the managed KV round trip did not return the written value")
  }
  console.log("managed KV set/get passed")
} finally {
  await laser.close()
}
