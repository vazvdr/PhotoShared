import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import Masonry from "react-masonry-css";
import { auth, db } from "../firebaseConfig";
import { unfollowUser } from "../services/FollowService";
import {
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

const ACCESS_KEY = "GLPyI9cg472u7_mz7vZemXeC4bY2yyDE_YAxPtzuivg";

export default function Feed() {
  const [photos, setPhotos] = useState([]);
  const [liked, setLiked] = useState({});
  const [likes, setLikes] = useState({});
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [followingUsernames, setFollowingUsernames] = useState([]);
  const currentUser = auth.currentUser;
  const [showScrollTop, setShowScrollTop] = useState(false);

  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Buscar feed (fotos dos usuários seguidos)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const fetchFeed = async () => {
      try {
        const followsRef = collection(db, "follows");
        const q = query(followsRef, where("followerId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const followedUsernames = querySnapshot.docs.map(
          (doc) => doc.data().followingId
        );

        const posts = [];
        for (const username of followedUsernames) {
          const res = await fetch(
            `https://api.unsplash.com/users/${username}/photos?page=1&per_page=10&client_id=${ACCESS_KEY}`
          );
          const data = await res.json();
          posts.push(...data);
        }

        setPhotos(posts);
      } catch (e) {
        console.error("Erro ao carregar o feed:", e);
      }
    };

    fetchFeed();
  }, []);

  // Buscar curtidas do usuário para restaurar estado
  useEffect(() => {
    const fetchLikes = async () => {
      if (!currentUser) return;

      try {
        const q = query(
          collection(db, "likes"),
          where("userId", "==", currentUser.uid)
        );
        const querySnapshot = await getDocs(q);

        const userLiked = {};
        const userLikesCount = {};

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          userLiked[data.photoId] = true;
          userLikesCount[data.photoId] =
            (userLikesCount[data.photoId] ?? 0) + 1;
        });

        setLiked(userLiked);
        setLikes((prev) => ({ ...prev, ...userLikesCount }));
      } catch (err) {
        console.error("Erro ao buscar curtidas:", err);
      }
    };

    fetchLikes();
  }, [currentUser]);

  const toggleLike = async (photo) => {
    if (!currentUser) return;

    const key = `${currentUser.uid}_${photo.id}`;
    const isLiked = !!liked[photo.id];

    try {
      if (isLiked) {
        await deleteDoc(doc(db, "likes", key));
      } else {
        await setDoc(doc(db, "likes", key), {
          userId: currentUser.uid,
          photoId: photo.id,
          createdAt: serverTimestamp(),
          photoURL: photo?.urls?.regular || "",
          authorUsername: photo?.user?.username || "",
        });
      }

      setLiked((prev) => ({ ...prev, [photo.id]: !isLiked }));
      setLikes((prev) => {
        const base = prev[photo.id] ?? photo.likes ?? 0;
        return {
          ...prev,
          [photo.id]: isLiked ? Math.max(base - 1, 0) : base + 1,
        };
      });
    } catch (e) {
      console.error("Erro ao alternar like:", e);
    }
  };

  const handleUnfollow = async (username) => {
    try {
      await unfollowUser(currentUser.uid, username);
      setPhotos((prev) =>
        prev.filter((photo) => photo.user.username !== username)
      );
      setFollowingUsernames((prev) => prev.filter((u) => u !== username));
    } catch (err) {
      console.error("Erro ao deixar de seguir:", err);
    }
  };

  return (
    <>
      <Header />
      <div className="min-w-screen min-h-screen pt-20 p-4">
        <div className="w-[98%] mx-auto">
          {photos.length === 0 && (
            <div className="text-center text-white m-auto">
              Nenhuma foto disponível no feed.
            </div>
          )}

          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="flex gap-4"
            columnClassName="bg-clip-padding"
          >
            {photos.map((photo) => (
              <div key={photo.id} className="py-1">
                <div className="relative rounded-lg overflow-hidden shadow-md cursor-pointer">
                  <img
                    src={photo.urls.small}
                    alt={photo.alt_description || "Foto"}
                    className="w-full h-auto object-cover"
                    onClick={() => setSelectedPhoto(photo)}
                  />

                  <div className="absolute bottom-0 left-0 w-full bg-black/50 text-white p-1 text-sm flex justify-between items-center">
                    <span className="truncate">{photo.user.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnfollow(photo.user.username);
                      }}
                      className="text-white px-1 py-1 text-xs rounded"
                    >
                      Deixar de seguir
                    </button>
                  </div>

                  {/* Curtida */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(photo);
                    }}
                    className={`absolute top-2 right-2 rounded-full px-3 py-1 text-xs font-medium shadow
                      ${
                        liked[photo.id]
                          ? "bg-black/80 text-red-600"
                          : "bg-black/50 text-white hover:bg-black/80"
                      }`}
                  >
                    {liked[photo.id] ? "♥" : "♡"}{" "}
                    {likes[photo.id] ?? photo.likes ?? 0}
                  </button>
                </div>
              </div>
            ))}
          </Masonry>
        </div>

        {/* Modal */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedPhoto(null);
            }}
          >
            <div className="relative bg-white rounded-lg max-w-4xl w-full max-h-[90vh] shadow-lg flex flex-col">
              <button
                className="absolute top-4 right-4 bg-neutral-700 hover:bg-neutral-800 text-white text-2xl font-bold w-10 h-10 rounded-full flex items-center justify-center shadow-md transition"
                onClick={() => setSelectedPhoto(null)}
                aria-label="Fechar"
              >
                ✕
              </button>
              <div className="flex-grow flex items-center justify-center p-4 overflow-auto">
                <img
                  src={selectedPhoto.urls.regular}
                  alt={selectedPhoto.alt_description || "Foto"}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              </div>

              <div className="p-4 text-gray-800 flex justify-between items-center">
                <h2 className="text-xl font-bold">{selectedPhoto.user.name}</h2>
                <button
                  onClick={() => toggleLike(selectedPhoto)}
                  className={`px-3 py-2 rounded transition text-sm ${
                    liked[selectedPhoto.id]
                      ? "bg-neutral-700 hover:bg-neutral-800 text-white"
                      : "bg-neutral-700 hover:bg-neutral-800 text-white"
                  }`}
                >
                  {liked[selectedPhoto.id] ? "♥ Curtido" : "♡ Curtir"} (
                  {likes[selectedPhoto.id] ?? selectedPhoto.likes ?? 0})
                </button>
              </div>
            </div>
          </div>
        )}
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
