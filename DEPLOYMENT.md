# 🚀 4-App Deployment Guide

## ✅ Successfully Deployed!

Your app is now live and accessible to everyone!

### 🌐 Live URL
**https://nagadityavajjhala.github.io/4-app/**

Share this URL with your friends and family to invite them to use the app!

---

## 📱 How Friends & Family Can Join

1. **Share the URL**: Send them `https://nagadityavajjhala.github.io/4-app/`
2. **Create Account**: They click "Sign Up" and create an account with email + password
3. **Start Chatting**: 
   - They tap the **+** button in the Chats tab
   - Enter YOUR email address to start a conversation
   - All messages are end-to-end encrypted!

---

## 🔄 How to Update Your App

Whenever you make changes to your code:

```bash
# 1. Make your changes to the code
# 2. Commit the changes
git add .
git commit -m "Description of your changes"
git push origin main

# 3. Deploy the updated version
npm run deploy
```

The app will be updated at the same URL within 1-2 minutes.

---

## 📊 Repository Information

- **GitHub Repository**: https://github.com/nagadityavajjhala/4-app
- **Live Site**: https://nagadityavajjhala.github.io/4-app/
- **Deployment Branch**: gh-pages
- **Status**: ✅ Built and Live

---

## 🎯 Available Features

✅ **End-to-End Encrypted Chats** - Private messaging with X25519 encryption  
✅ **Audio & Video Calls** - WebRTC peer-to-peer calling  
✅ **24-Hour Status Updates** - Instagram Stories-style status bar  
✅ **News Feed** - BBC News integration  
✅ **Games** - Trivia and Wordle built-in  
✅ **Typing Indicators** - See when someone is typing  
✅ **Online Presence** - See who's online  
✅ **Message Reactions** - React to messages with emojis  
✅ **Chat Themes** - Customize your chat appearance  

---

## 🔐 Privacy & Security

- All messages are encrypted client-side before being sent to Firebase
- Firebase only stores encrypted ciphertext
- Only you and your recipient can decrypt messages
- Each user gets a unique permanent ID (e.g., `swift.moon.4721`)
- WebRTC calls are peer-to-peer (not routed through servers)

---

## 🛠 Local Development

To run the app locally for testing:

```bash
npm run dev
```

Opens at: http://localhost:5173

---

## 📞 Support

If you encounter any issues:
1. Check that Firebase services are enabled in your Firebase Console
2. Ensure security rules are deployed: `firebase deploy --only firestore:rules,database`
3. Clear browser cache and try again

---

**Built with ♥ for your inner circle**
