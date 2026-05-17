/**
 * End-to-End Encryption using X25519 (Curve25519) key exchange + XSalsa20-Poly1305
 * Each user has a permanent keypair stored in localStorage.
 * Messages are encrypted with a shared secret derived from sender's private key + receiver's public key.
 */

import nacl from 'tweetnacl'
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util'

const KEYPAIR_KEY = '4_keypair'

// Generate or load persistent keypair
export function getOrCreateKeypair() {
  const stored = localStorage.getItem(KEYPAIR_KEY)
  if (stored) {
    const { publicKey, secretKey } = JSON.parse(stored)
    return {
      publicKey: decodeBase64(publicKey),
      secretKey: decodeBase64(secretKey),
    }
  }
  const keypair = nacl.box.keyPair()
  localStorage.setItem(KEYPAIR_KEY, JSON.stringify({
    publicKey: encodeBase64(keypair.publicKey),
    secretKey: encodeBase64(keypair.secretKey),
  }))
  return keypair
}

export function getPublicKeyB64() {
  return encodeBase64(getOrCreateKeypair().publicKey)
}

// Derive shared key between two parties
function getSharedKey(mySecretKey, theirPublicKeyB64) {
  const theirPublicKey = decodeBase64(theirPublicKeyB64)
  return nacl.box.before(theirPublicKey, mySecretKey)
}

// Encrypt a message for a specific recipient
export function encryptMessage(plaintext, theirPublicKeyB64) {
  const { secretKey } = getOrCreateKeypair()
  const sharedKey = getSharedKey(secretKey, theirPublicKeyB64)
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const messageBytes = encodeUTF8(plaintext)
  const encrypted = nacl.box.after(messageBytes, nonce, sharedKey)
  return {
    ciphertext: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
  }
}

// Decrypt a message from a specific sender
export function decryptMessage(ciphertext, nonce, senderPublicKeyB64) {
  try {
    const { secretKey } = getOrCreateKeypair()
    const sharedKey = getSharedKey(secretKey, senderPublicKeyB64)
    const decrypted = nacl.box.open.after(
      decodeBase64(ciphertext),
      decodeBase64(nonce),
      sharedKey
    )
    if (!decrypted) return '[Decryption failed]'
    return decodeUTF8(decrypted)
  } catch {
    return '[Encrypted message]'
  }
}

// For group/broadcast messages: symmetric encryption with a room key
export function encryptSymmetric(plaintext, keyB64) {
  const key = decodeBase64(keyB64)
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  const messageBytes = encodeUTF8(plaintext)
  const encrypted = nacl.secretbox(messageBytes, nonce, key)
  return {
    ciphertext: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
  }
}

export function decryptSymmetric(ciphertext, nonce, keyB64) {
  try {
    const key = decodeBase64(keyB64)
    const decrypted = nacl.secretbox.open(
      decodeBase64(ciphertext),
      decodeBase64(nonce),
      key
    )
    if (!decrypted) return '[Decryption failed]'
    return decodeUTF8(decrypted)
  } catch {
    return '[Encrypted message]'
  }
}
