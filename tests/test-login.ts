import assert from "node:assert/strict";
import { devLogin } from "../src/lib/test-login";

const prod = { NODE_ENV: "production", ALLOW_PRODUCTION_DEV_OTP: "true", DEV_OTP_CODE: "85936247", DEV_OTP_PHONES: "9000000001,9000000002", TEST_ADMIN_PHONES: "9000000001" };
assert.deepEqual(devLogin("9000000001", prod), { code: "85936247", reveal: false, admin: true });
assert.equal(devLogin("9000000002", prod).admin, false);
assert.throws(() => devLogin("9000000003", prod), { status: 403 });
assert.throws(() => devLogin("9000000001", { ...prod, ALLOW_PRODUCTION_DEV_OTP: "false" }), { status: 503 });
assert.throws(() => devLogin("9000000001", { ...prod, DEV_OTP_CODE: "123456" }), { status: 503 });
assert.throws(() => devLogin("9000000001", { ...prod, DEV_OTP_CODE: "11111111" }), { status: 503 });
assert.throws(() => devLogin("9000000001", { ...prod, TEST_ADMIN_PHONES: "9000000003" }), { status: 503 });
assert.deepEqual(devLogin("9000000001", { NODE_ENV: "development" }), { code: "123456", reveal: true, admin: false });
console.log("PASS: private production test code, approved phones/admins, explicit opt-in and local demo compatibility.");
