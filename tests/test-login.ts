import assert from "node:assert/strict";
import { devLogin, testOtpHint } from "../src/lib/test-login";

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

const hints = { ...prod, OTP_MODE: "dev", SHOW_TEST_OTP: "true" };
assert.equal(testOtpHint("+91 90000 00001", hints), prod.DEV_OTP_CODE);
assert.equal(testOtpHint("9000000002", hints), prod.DEV_OTP_CODE);
assert.equal(devLogin("9000000002", hints).reveal, true);
assert.equal(devLogin("9000000002", hints).admin, false);
assert.equal(testOtpHint("9000000003", hints), null);
assert.equal(testOtpHint("90000", hints), null);
assert.equal(testOtpHint("9000000001", prod), null);
assert.equal(testOtpHint("9000000001", { ...hints, SHOW_TEST_OTP: "false" }), null);
assert.equal(testOtpHint("9000000001", { ...hints, OTP_MODE: "msg91" }), null);
assert.equal(testOtpHint("9000000001", { ...hints, ALLOW_PRODUCTION_DEV_OTP: "false" }), null);
console.log("PASS: temporary OTP hints require opt-in, dev mode and an approved phone; real SMS mode and other numbers expose no code.");
