import { useEffect, useState, useRef } from "react";
import Header from "../components/Header";
import { auth, db, storage } from "../firebaseConfig";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import Masonry from "react-masonry-css";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [activeTab, setActiveTab] = useState("curtidas");
  const [postsCount, setPostsCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followingList, setFollowingList] = useState([]);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [loadingProfilePhoto, setLoadingProfilePhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [modalPhoto, setModalPhoto] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [editDescription, setEditDescription] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        let photoURL = null;

        // 1. Verifica Firestore
        if (userDoc.exists()) {
          const data = userDoc.data();
          photoURL = data.photoURL || null;
          setUserData({
            ...data,
            name: user.displayName || data.name || "Usuário",
            email: user.email,
            photoURL, // inicial
          });
        } else {
          setUserData({
            name: user.displayName || "Usuário",
            email: user.email,
            photoURL: null,
          });
        }

        // 2. Se não tiver no Firestore, tenta pegar direto do Storage
        if (!photoURL) {
          try {
            const storageRef = ref(storage, `profilePictures/${user.uid}`);
            const urlFromStorage = await getDownloadURL(storageRef);
            setUserData((prev) => ({
              ...prev,
              photoURL: urlFromStorage,
            }));
          } catch (err) {
            console.log("Nenhuma foto encontrada no storage.");
          }
        }
      } catch (error) {
        console.error("Erro ao buscar dados do usuário:", error);
      }
    };
    fetchUserData();
  }, [user]);

  // Contar posts assim que o usuário estiver carregado
  useEffect(() => {
    if (!user) return;

    const postsQuery = query(
      collection(db, "posts"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      setPostsCount(snapshot.docs.length);
    }, (err) => {
      console.error("Erro ao contar posts:", err);
    });

    return () => unsubscribe();
  }, [user]);

  const handleProfileClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      setLoadingProfilePhoto(true);
      const storageRef = ref(storage, `profilePictures/${user.uid}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", user.uid), { photoURL });

      // Atualiza imediatamente
      setUserData((prev) => ({ ...prev, photoURL }));

    } catch (err) {
      console.error("Erro ao enviar foto:", err);
    } finally {
      setLoadingProfilePhoto(false);
    }
  };

  const handleUnlike = async (likeDocId) => {
    if (!likeDocId) return;
    await deleteDoc(doc(db, "likes", likeDocId));
    setPhotos((prev) => prev.filter((p) => p.id !== likeDocId));
  };

  const handleDeletePhoto = async () => {
    if (!user) return;
    try {
      // 1. Apagar do Storage
      const storageRef = ref(storage, `profilePictures/${user.uid}`);
      await deleteObject(storageRef);
  
      // 2. Criar ou atualizar Firestore (com merge)
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(
        userDocRef,
        { photoURL: null },
        { merge: true } // cria o doc se não existir
      );
  
      // 3. Atualizar Firebase Auth
      await updateProfile(user, { photoURL: null });
  
      // 4. Atualizar state local
      setUserData((prev) => ({
        ...prev,
        photoURL: null,
      }));
    } catch (error) {
      console.error("Erro ao apagar foto:", error);
    }
  };

  const handleDeletePost = async (photo) => {
    if (!user || !photo?.id) return;
    try {
      // 1. Apaga do Storage
      if (photo.storagePath) {
        const storageRef = ref(storage, photo.storagePath);
        await deleteObject(storageRef);
      }
  
      // 2. Apaga do Firestore
      await deleteDoc(doc(db, "posts", photo.id));
  
      // 3. Atualiza frontend
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (error) {
      console.error("Erro ao apagar postagem:", error);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPhoto) return;
    try {
      await updateDoc(doc(db, "posts", editingPhoto.id), {
        description: editDescription,
      });
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === editingPhoto.id ? { ...p, description: editDescription } : p
        )
      );
      setEditingPhoto(null);
      setEditDescription("");
    } catch (error) {
      console.error("Erro ao salvar descrição:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUnfollow = async (followingId) => {
    try {
      if (!user) return;
      const qF = query(
        collection(db, "follows"),
        where("followerId", "==", user.uid),
        where("followingId", "==", followingId)
      );
      const snapshot = await getDocs(qF);
      snapshot.forEach(async (docSnap) => {
        await deleteDoc(doc(db, "follows", docSnap.id));
      });
      setFollowingList((prev) => prev.filter((f) => f !== followingId));
      setFollowingCount((prev) => Math.max(prev - 1, 0));
    } catch (error) {
      console.error("Erro ao deixar de seguir:", error);
    }
  };

  useEffect(() => {
    if (!user) return;
    const followsQuery = query(
      collection(db, "follows"),
      where("followerId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(followsQuery, (snapshot) => {
      const data = snapshot.docs.map((d) => d.data());
      setFollowingCount(data.length);
      setFollowingList(data.map((item) => item.followingId));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoadingPhotos(true);
    setPhotoError(null);

    let unsubscribe;
    if (activeTab === "postagens") {
      const postsQuery = query(
        collection(db, "posts"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      unsubscribe = onSnapshot(
        postsQuery,
        (snapshot) => {
          const posts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          setPostsCount(posts.length);
          const onlyWithUrl = posts.filter(
            (p) => typeof p.photoURL === "string" && p.photoURL.trim() !== ""
          );
          setPhotos(onlyWithUrl);
          setLoadingPhotos(false);
        },
        (err) => {
          console.error("Erro ao escutar postagens:", err);
          setPhotoError(
            "Não foi possível carregar as postagens. Índice do Firestore ausente."
          );
          setPhotos([]);
          setLoadingPhotos(false);
        }
      );
    } else {
      const likesQuery = query(
        collection(db, "likes"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      unsubscribe = onSnapshot(
        likesQuery,
        (snapshot) => {
          const likes = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              photoId: data.photoId,
              photoURL:
                data.photoURL || data.imageUrl || data.urls?.regular || "",
              authorUsername: data.authorUsername || data.user?.username || "",
              authorName:
                data.authorName ||
                data.user?.name ||
                data.authorUsername ||
                "Autor",
              description: data.description || data.alt_description || "",
              createdAt: data.createdAt?.toDate?.() || new Date(0),
            };
          });
          setPhotos(likes);
          setLoadingPhotos(false);
        },
        (err) => {
          console.error("Erro ao escutar curtidas:", err);
          setPhotoError(
            "Não foi possível carregar as curtidas. Índice do Firestore ausente."
          );
          setPhotos([]);
          setLoadingPhotos(false);
        }
      );
    }

    return () => unsubscribe && unsubscribe();
  }, [activeTab, user]);

  const breakpointColumnsObj = { default: 4, 1100: 3, 700: 2, 500: 1 };

  return (
    <>
      <Header />
      <div className="min-w-screen min-h-screen pt-18 pb-4 pl-2 pr-2 ">
        <div className="mx-auto">
          {/* Perfil */}
          <div className="flex flex-col items-center text-center mb-6 relative">
            <div className="relative w-24 h-24">
              {userData?.photoURL ? (
                <>
                  <img
                    key={userData.photoURL}
                    src={userData.photoURL}
                    alt={userData?.name || "Perfil"}
                    className="w-24 h-24 border border-white rounded-full object-cover"
                  />

                  {/* Botão de atualizar no centro */}
                  <div
                    onClick={handleProfileClick}
                    className="absolute inset-0 flex items-center justify-center rounded-full cursor-pointer opacity-0 hover:opacity-100 transition"
                    title="Alterar foto"
                  >
                    {loadingProfilePhoto ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.232 5.232l3.536 3.536M9 11l6 6m-3-3l3 3m0 0l3-3m-3 3V5a2 2 0 00-2-2H7a2 2 0 00-2 2v6"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Botão remover */}
                  <button
                    onClick={handleDeletePhoto}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center transition-transform transform hover:scale-110 hover:bg-red-600"
                    title="Remover foto"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <div
                  onClick={handleProfileClick}
                  className="w-24 h-24 border border-neutral-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/20 transition-transform transform hover:scale-105"
                  title="Adicionar foto"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-neutral-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              )}
            </div>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />

            <h1 className="text-2xl font-bold mt-2">
              {userData?.name || "Usuário"}
            </h1>
            {userData?.bio && <p className="mt-1">{userData.bio}</p>}
            <div className="flex gap-6 mt-2 justify-center">
              <span className="">
                <strong>{postsCount}</strong> posts
              </span>
              <span
                className="cursor-pointer"
                onClick={() => setShowFollowingModal(true)}
              >
                <strong>{followingCount}</strong> Seguindo
              </span>
            </div>

            {showFollowingModal && (
              <div
                className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
                onClick={() => setShowFollowingModal(false)}
              >
                <div
                  className="bg-black text-white rounded-lg shadow-lg w-80 max-h-[80vh] p-4 overflow-y-auto scrollbar-hide"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-semibold mb-4">Seguindo</h3>

                  {followingList.length > 0 ? (
                    <ul className="space-y-3">
                      {followingList.map((name, idx) => (
                        <li
                          key={idx}
                          className="flex justify-between items-center border-b border-gray-200 pb-2 last:border-none"
                        >
                          <span>{name}</span>
                          <button
                            className="whitespace-nowrap bg-red-500 text-white text-sm rounded hover:bg-red-600 transition"
                            onClick={() => handleUnfollow(name)}
                          >
                            Deixar de seguir
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      Você não está seguindo ninguém.
                    </p>
                  )}

                  <button
                    className="mt-4 w-full bg-neutral-700 text-white py-2 rounded hover:bg-neutral-800 transition"
                    onClick={() => setShowFollowingModal(false)}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}

            {/* Abas */}
            <div className="flex gap-4 mt-2 border-b border-gray-300">
              <button
                className={`pb-2 ${activeTab === "postagens"
                  ? "border-b-2 border-black font-bold text-zinc-500"
                  : "text-neutral-700"
                  }`}
                onClick={() => setActiveTab("postagens")}
              >
                Postagens
              </button>
              <button
                className={`pb-2 ${activeTab === "curtidas"
                  ? "border-b-2 border-black font-bold text-zinc-500"
                  : "text-neutral-700"
                  }`}
                onClick={() => setActiveTab("curtidas")}
              >
                Curtidas
              </button>
            </div>
          </div>

          {/* Fotos */}
          <div className="min-h-[120px]">
            {loadingPhotos ? (
              <div className="text-center text-gray-400 mt-8">Carregando...</div>
            ) : photoError ? (
              <div className="text-center text-red-500 mt-8">{photoError}</div>
            ) : photos.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                {activeTab === "postagens"
                  ? "Você ainda não tem postagens."
                  : "Nenhuma curtida encontrada."}
              </div>
            ) : (
              <Masonry
                breakpointCols={breakpointColumnsObj}
                className="flex gap-4"
                columnClassName="bg-clip-padding"
              >
                {photos.map((photo) => {
                  const imageUrl =
                    photo.photoURL || photo.imageUrl || photo.urls?.regular || "";
                  if (!imageUrl) return null;

                  return (
                    <div
                      key={photo.id}
                      className="relative rounded-lg overflow-hidden shadow-md cursor-pointer"
                    >
                      {/* Modal de foto */}
                      {modalPhoto === photo.id && (
                        <div
                          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                          onClick={() => setModalPhoto(null)}
                        >
                          <img
                            src={imageUrl}
                            alt={photo.description || "Foto"}
                            className="max-h-[90vh] object-contain rounded"
                          />
                        </div>
                      )}

                      <img
                        src={imageUrl}
                        alt={photo.description || "Foto"}
                        className="w-full h-auto object-cover"
                        onClick={() => setModalPhoto(photo.id)}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />

                      {photo.description && (
                        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/70 via-black/40 to-transparent text-white text-center py-2 px-3">
                          <p className="text-sm">{photo.description}</p>
                        </div>
                      )}

                      {/* Postagens: Dropdown 3 pontinhos */}
                      {activeTab === "postagens" && (
                        <div className="absolute top-1 right-1 z-10" ref={dropdownRef}>
                          <div className="relative">
                            <button
                              className="p-1 text-neutral-700 transition-transform transform hover:scale-110"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(openDropdownId === photo.id ? null : photo.id);
                              }}
                            >
                              ⋮
                            </button>

                            {openDropdownId === photo.id && (
                              <div className="absolute right-0 mt-2 z-50 bg-gray-900 rounded shadow-lg">
                                <button
                                  className="block px-4 py-2 text-sm text-white w-full text-left whitespace-nowrap"
                                  onClick={() => {
                                    setEditingPhoto(photo);
                                    setEditDescription(photo.description || "");
                                    setOpenDropdownId(null);
                                  }}
                                >
                                  Editar descrição
                                </button>
                                <button
                                  className="block px-4 py-2 text-sm text-red-500 w-full text-left whitespace-nowrap"
                                  onClick={() => {
                                    handleDeletePost(photo);
                                    setOpenDropdownId(null);
                                  }}
                                >
                                  Apagar foto
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Curtidas: botão coração */}
                      {activeTab === "curtidas" && (
                        <button
                          className="absolute top-1 right-1 z-10 bg-black/50 rounded-full  hover:bg-black/80 transition-transform transform hover:scale-105"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnlike(photo.id);
                          }}
                          title="Remover curtida"
                        >
                          ❤️
                        </button>
                      )}
                    </div>
                  );
                })}
              </Masonry>
            )}
          </div>

          {/* Modal de edição */}
          {editingPhoto && (
            <div
              className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
              onClick={() => setEditingPhoto(null)}
            >
              <div
                className="bg-black text-white rounded p-4 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-lg font-bold mb-2">Editar descrição</h2>
                <textarea
                  className="w-full border border-gray-300 p-2 rounded mb-4"
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button
                    className="bg-gray-300 text-black px-3 py-1 rounded hover:bg-gray-400"
                    onClick={() => setEditingPhoto(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="bg-neutral-700 text-white px-3 py-1 rounded hover:bg-neutral-800"
                    onClick={handleSaveEdit}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-white text-black p-3 rounded shadow-lg transition z-50 flex items-center justify-center"
          aria-label="Voltar ao topo"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
    </>
  );
}
