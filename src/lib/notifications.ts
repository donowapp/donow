import { db } from './firebase';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Notification } from '@/types';

type FirestoreTimestamp = { toDate: () => Date };

function normalizeDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as FirestoreTimestamp).toDate();
  }
  return new Date();
}

function normalizeNotification(id: string, data: Record<string, unknown>): Notification {
  return {
    id,
    userId: (data.userId as string) ?? '',
    type: (data.type as Notification['type']) ?? 'message',
    title: (data.title as string) ?? '',
    body: (data.body as string) ?? '',
    isRead: (data.isRead as boolean) ?? false,
    donationId: data.donationId as string | undefined,
    conversationId: data.conversationId as string | undefined,
    createdAt: normalizeDate(data.createdAt),
  };
}

export async function createNotification(
  data: Omit<Notification, 'id' | 'createdAt' | 'isRead'>
): Promise<void> {
  await addDoc(collection(db, 'notifications'), {
    ...data,
    isRead: false,
    createdAt: new Date(),
  });
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): () => void {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId)
  );
  return onSnapshot(q, (snap) => {
    const notifs = snap.docs
      .map((d) => normalizeNotification(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    callback(notifs);
  });
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', id), { isRead: true });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('isRead', '==', false)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { isRead: true }));
  await batch.commit();
}
