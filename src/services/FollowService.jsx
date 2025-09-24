import { db } from "../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";

// Verifica se o usuário atual já segue outro usuário
export async function checkIfFollowing(followerId, followingId) {
  if (!followerId || !followingId) return false;

  const q = query(
    collection(db, "follows"),
    where("followerId", "==", followerId),
    where("followingId", "==", followingId)
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// Seguir um usuário
export async function followUser(followerId, followingId) {
  if (!followerId || !followingId) return;

  await addDoc(collection(db, "follows"), {
    followerId,
    followingId,
    createdAt: serverTimestamp(),
  });
}

// Deixar de seguir um usuário
export async function unfollowUser(followerId, followingId) {
  if (!followerId || !followingId) return;

  const q = query(
    collection(db, "follows"),
    where("followerId", "==", followerId),
    where("followingId", "==", followingId)
  );

  const snapshot = await getDocs(q);
  snapshot.forEach(async (docSnap) => {
    await deleteDoc(docSnap.ref);
  });
}

// Contagem de usuários que este usuário segue
export async function getFollowingCount(userId) {
  if (!userId) return 0;

  const q = query(
    collection(db, "follows"),
    where("followerId", "==", userId)
  );

  const snap = await getDocs(q);
  return snap.size;
}

// Retorna uma lista de userIds que o usuário segue
export async function getFollowingUsers(followerId) {
  if (!followerId) return [];

  const q = query(
    collection(db, "follows"),
    where("followerId", "==", followerId)
  );

  const snap = await getDocs(q);
  return snap.docs.map(docSnap => docSnap.data().followingId);
}

