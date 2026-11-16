#!/usr/bin/env node
/*
 * Makes a new passcode for the private /stats page (worker/stats-page.ts).
 *
 *   npm run stats-passcode
 *
 * Keep the passcode somewhere private. Put the hash in wrangler.jsonc as STATS_PASSCODE_SHA256, in
 * "vars" and in "previews.vars", and deploy: the old passcode stops working. The hash can be public
 * because the passcode is 20 random characters (100 bits), far too many to guess.
 */
import { createHash, randomBytes } from 'node:crypto'

// 32 letters and digits, without ones that look alike (l, o, 0, 1), so each character is 5 random bits.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'
const passcode = Array.from(randomBytes(20), (byte) => ALPHABET[byte & 31]).join('')

console.log(`Passcode: ${passcode.match(/.{5}/g).join('-')}`)
console.log(`STATS_PASSCODE_SHA256: ${createHash('sha256').update(passcode).digest('hex')}`)
