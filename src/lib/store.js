import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // Auth
  user: null,
  userProfile: null,
  setUser: (user) => set({ user }),
  setUserProfile: (userProfile) => set({ userProfile }),

  // Navigation
  activeTab: 'chats',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Active chat
  activeChatId: null,
  activeChatUser: null,
  setActiveChat: (chatId, chatUser) => set({ activeChatId: chatId, activeChatUser: chatUser }),
  clearActiveChat: () => set({ activeChatId: null, activeChatUser: null }),

  // Contacts (family/friends)
  contacts: [],
  setContacts: (contacts) => set({ contacts }),

  // Call state
  callState: null, // null | 'incoming' | 'outgoing' | 'active'
  callData: null,
  setCallState: (callState, callData = null) => set({ callState, callData }),

  // Online presence
  onlineUsers: {},
  setOnlineUsers: (onlineUsers) => set({ onlineUsers }),
  updateUserPresence: (uid, status) => set(state => ({
    onlineUsers: { ...state.onlineUsers, [uid]: status }
  })),
}))
