import { storage, db } from "../firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const uploadPhoto = async (uid, file, description) => {
  // 🔹 Gera um caminho único no Storage
  const storagePath = `posts/${uid}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, storagePath);

  // 🔹 Faz upload
  await uploadBytes(storageRef, file);

  // 🔹 Gera a URL de download
  const photoURL = await getDownloadURL(storageRef);

  // 🔹 Salva no Firestore (junto com o caminho real do Storage)
  const docRef = await addDoc(collection(db, "posts"), {
    userId: uid,
    photoURL,
    description,
    storagePath,
    createdAt: serverTimestamp(),
  });

  return { photoURL, id: docRef.id, storagePath };
};
