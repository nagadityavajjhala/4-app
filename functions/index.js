const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()

/**
 * Triggers on new message creation in any conversation.
 * Sends push notifications to the recipient via FCM.
 */
exports.sendMessageNotification = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data()
    const { conversationId } = context.params

    // Ignore non-user messages (server timestamps, etc.)
    if (!message.senderId) return

    const convoSnap = await admin.firestore().doc(`conversations/${conversationId}`).get()
    const convo = convoSnap.data()
    if (!convo || !convo.members) return

    // Find the recipient (the member who is NOT the sender)
    const recipientUid = convo.members.find(m => m !== message.senderId)
    if (!recipientUid) return

    const senderSnap = await admin.firestore().doc(`users/${message.senderId}`).get()
    const sender = senderSnap.data()
    const senderName = sender?.displayName || 'Someone'

    let body = ''
    if (message.type === 'text') {
      // For encrypted messages, show a generic preview
      if (message.encrypted) {
        body = 'Sent a message'
      } else {
        body = (message.text || '').slice(0, 200)
      }
    } else if (message.type === 'image') {
      body = '📷 Photo'
    } else if (message.type === 'audio') {
      body = '🎤 Voice message'
    } else if (message.type === 'game') {
      body = '🎮 Game'
    }

    // If replying to a message, include reply context
    if (message.replyTo) {
      body = `↩️ ${body}`
    }

    if (!body) body = 'New message'

    // Get recipient's FCM tokens
    const tokensSnap = await admin.firestore()
      .collection(`users/${recipientUid}/fcmTokens`)
      .get()

    if (tokensSnap.empty) return

    const tokens = []
    tokensSnap.forEach(doc => tokens.push(doc.data().token))

    const commonPayload = {
      notification: {
        title: senderName,
        body: body.slice(0, 200),
      },
      data: {
        conversationId,
        senderId: message.senderId,
        senderName,
        body: body.slice(0, 200),
        type: 'message',
      },
    }

    const results = await Promise.allSettled(
      tokens.map(token =>
        admin.messaging().send({ ...commonPayload, token }).catch(err => {
          if (
            err.code === 'messaging/invalid-registration-token' ||
            err.code === 'messaging/registration-token-not-registered'
          ) {
            return admin
              .firestore()
              .collection(`users/${recipientUid}/fcmTokens`)
              .doc(token)
              .delete()
          }
          functions.logger.warn('FCM send failed', err.code, token.slice(0, 16))
        })
      )
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    functions.logger.info(
      `Sent ${sent}/${tokens.length} push notifications for message ${context.params.messageId}`
    )
  })
