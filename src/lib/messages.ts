import { db } from './firebase';
import { createNotification } from './notifications';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Message } from '@/types';

export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  donationId: string;
  donationTitle: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: Record<string, number>;
}

type FirestoreTimestamp = { toDate: () => Date };

function normalizeDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as FirestoreTimestamp).toDate();
  }
  return new Date();
}

function normalizeConversation(id: string, data: Record<string, unknown>): Conversation {
  return {
    id,
    participantIds: (data.participantIds as string[]) ?? [],
    participantNames: (data.participantNames as Record<string, string>) ?? {},
    donationId: (data.donationId as string) ?? '',
    donationTitle: (data.donationTitle as string) ?? '',
    lastMessage: (data.lastMessage as string) ?? '',
    lastMessageAt: normalizeDate(data.lastMessageAt),
    unreadCount: (data.unreadCount as Record<string, number>) ?? {},
  };
}

function normalizeMessage(id: string, data: Record<string, unknown>): Message {
  return {
    id,
    senderId: (data.senderId as string) ?? '',
    receiverId: (data.receiverId as string) ?? '',
    donationId: (data.donationId as string) ?? '',
    content: (data.content as string) ?? '',
    isRead: (data.isRead as boolean) ?? false,
    createdAt: normalizeDate(data.createdAt),
  };
}

export function buildConversationId(
  donationId: string,
  userId1: string,
  userId2: string
): string {
  return `${donationId}_${[userId1, userId2].sort().join('_')}`;
}

export async function getOrCreateConversation(
  donationId: string,
  donorId: string,
  requesterId: string,
  donorName: string,
  requesterName: string,
  donationTitle: string
): Promise<string> {
  const id = buildConversationId(donationId, donorId, requesterId);
  const convRef = doc(db, 'conversations', id);
  const snap = await getDoc(convRef);

  if (!snap.exists()) {
    await setDoc(convRef, {
      participantIds: [donorId, requesterId],
      participantNames: {
        [donorId]: donorName,
        [requesterId]: requesterName,
      },
      donationId,
      donationTitle,
      lastMessage: '',
      lastMessageAt: new Date(),
      unreadCount: { [donorId]: 0, [requesterId]: 0 },
    });
  }

  return id;
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const snap = await getDoc(doc(db, 'conversations', id));
  if (!snap.exists()) return null;
  return normalizeConversation(snap.id, snap.data() as Record<string, unknown>);
}

export function subscribeToConversations(
  userId: string,
  callback: (conversations: Conversation[]) => void
): () => void {
  const q = query(
    collection(db, 'conversations'),
    where('participantIds', 'array-contains', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const convs = snapshot.docs
      .map((d) => normalizeConversation(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
    callback(convs);
  });
}

export function subscribeToMessages(
  convId: string,
  callback: (messages: Message[]) => void
): () => void {
  const q = query(
    collection(db, 'conversations', convId, 'messages'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) =>
        normalizeMessage(d.id, d.data() as Record<string, unknown>)
      )
    );
  });
}

export async function sendMessage(
  convId: string,
  senderId: string,
  receiverId: string,
  donationId: string,
  content: string
): Promise<void> {
  const trimmed = content.trim();
  await addDoc(collection(db, 'conversations', convId, 'messages'), {
    senderId,
    receiverId,
    donationId,
    content: trimmed,
    isRead: false,
    createdAt: new Date(),
  });

  await updateDoc(doc(db, 'conversations', convId), {
    lastMessage: trimmed,
    lastMessageAt: new Date(),
    [`unreadCount.${receiverId}`]: increment(1),
  });

  createNotification({
    userId: receiverId,
    type: 'message',
    title: 'New message',
    body: trimmed.slice(0, 100),
    conversationId: convId,
    donationId,
  }).catch(() => {});
}

export async function markConversationRead(
  convId: string,
  userId: string
): Promise<void> {
  await updateDoc(doc(db, 'conversations', convId), {
    [`unreadCount.${userId}`]: 0,
  });
}
