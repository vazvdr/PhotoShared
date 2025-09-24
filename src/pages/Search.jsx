import { useEffect, useState, useRef, useCallback } from "react";
import Masonry from "react-masonry-css";
import Header from "../components/Header";
import { auth, db } from "../firebaseConfig";
import {
  checkIfFollowing,
  followUser,
  unfollowUser,
} from "../services/FollowService";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

const ACCESS_KEY = import.meta.env.VITE_ACCESS_KEY_UNSPLASH;

export default function Search({ setFollowingCount }) {
  const [photos, setPhotos] = useState([]);
  const [page, setPage] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [likes, setLikes] = useState({});
  const [following, setFollowing] = useState({});
  const [liked, setLiked] = useState({});
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [customSearch, setCustomSearch] = useState("");

  const loaderRef = useRef(null);

  const topics = [
    "people having fun",
    "landscapes",
    "selfies",
    "friends",
    "aesthetic houses",
    "streets",
    "urban",
    "headbanger",
    "rock concerts",
    "aurora borealis",
  ];

  const fetchPhotos = useCallback(async () => {
    try {
      if (customSearch) return;
  
      const topic = topics[Math.floor(Math.random() * topics.length)];
      const res = await fetch(
        `https://api.unsplash.com/search/photos?page=${page}&query=${topic}&per_page=15&client_id=${ACCESS_KEY}`
      );
      const data = await res.json();
      if (data.results) {
        const shuffled = [...data.results].sort(() => 0.5 - Math.random());
        setPhotos((prev) => (page === 1 ? shuffled : [...prev, ...shuffled]));
      }
    } catch (error) {
      console.error("Erro ao buscar fotos:", error);
    }
  }, [page, customSearch]);  

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

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !customSearch) {
          setPage((prev) => prev + 1);
        }        
      },
      { threshold: 1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [customSearch]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || photos.length === 0) return;

    (async () => {
      const updates = {};
      for (const photo of photos) {
        const username = photo?.user?.username;
        if (!username) continue;
        if (updates[username] !== undefined || following[username] !== undefined)
          continue;
        try {
          const isFollowing = await checkIfFollowing(user.uid, username);
          updates[username] = isFollowing;
        } catch (e) {
          console.warn("Falha ao checar follow:", e);
        }
      }
      if (Object.keys(updates).length) {
        setFollowing((prev) => ({ ...prev, ...updates }));
      }
    })();
  }, [photos]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || photos.length === 0) return;
    let cancelled = false;
    (async () => {
      const updates = {};
      const toCheck = photos.filter((p) => p?.id && liked[p.id] === undefined);
      await Promise.all(
        toCheck.map(async (p) => {
          try {
            const likeRef = doc(db, "likes", `${user.uid}_${p.id}`);
            const snap = await getDoc(likeRef);
            if (!cancelled) updates[p.id] = snap.exists();
          } catch (e) {
            console.warn("Falha ao checar like:", e);
          }
        })
      );
      if (!cancelled && Object.keys(updates).length) {
        setLiked((prev) => ({ ...prev, ...updates }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photos]);

  const toggleLike = async (photo) => {
    const user = auth.currentUser;
    if (!user) return alert("Você precisa estar logado para curtir.");

    const key = `${user.uid}_${photo.id}`;
    const isLiked = !!liked[photo.id];

    try {
      if (isLiked) {
        await deleteDoc(doc(db, "likes", key));
      } else {
        await setDoc(doc(db, "likes", key), {
          userId: user.uid,
          photoId: photo.id,
          createdAt: serverTimestamp(),
          source: "unsplash",
          photoURL: photo?.urls?.regular || "",
          thumb: photo?.urls?.thumb || "",
          description: photo?.alt_description || "",
          authorUsername: photo?.user?.username || "",
          authorName: photo?.user?.name || "",
          authorProfileImage: photo?.user?.profile_image?.medium || "",
          likesCount: photo?.likes || 0,
        });
      }

      setLiked((prev) => ({ ...prev, [photo.id]: !isLiked }));
      setLikes((prev) => {
        const base = prev[photo.id] ?? photo.likes ?? 0;
        return { ...prev, [photo.id]: isLiked ? Math.max(base - 1, 0) : base + 1 };
      });
    } catch (e) {
      console.error("Erro ao alternar like:", e);
    }
  };

  const handleFollow = async (authorUsername) => {
    const user = auth.currentUser;
    if (!user) return alert("Você precisa estar logado para seguir alguém");

    const isFollowing = await checkIfFollowing(user.uid, authorUsername);
    if (isFollowing) {
      await unfollowUser(user.uid, authorUsername);
      setFollowing((prev) => ({ ...prev, [authorUsername]: false }));
      setFollowingCount?.((prev) => Math.max(prev - 1, 0));
    } else {
      await followUser(user.uid, authorUsername);
      setFollowing((prev) => ({ ...prev, [authorUsername]: true }));
      setFollowingCount?.((prev) => (prev || 0) + 1);
    }
  };

  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
  
    try {
      setCustomSearch(searchQuery);
      setPage(1); 
      const res = await fetch(
        `https://api.unsplash.com/search/photos?page=1&query=${encodeURIComponent(
          searchQuery
        )}&per_page=15&client_id=${ACCESS_KEY}`
      );
      const data = await res.json();
      if (data.results) {
        setPhotos(data.results);
      }
    } catch (error) {
      console.error("Erro ao buscar fotos:", error);
    }
  };  

  return (
    <>
      <Header />
      <div className="min-w-screen min-h-screen mx-auto pt-20">
        {/* Barra de busca */}
        <div className="flex justify-center mb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar fotos..."
              className="border border-neutral-600 px-4 py-2 w-80 rounded-lg 
        focus:outline-none focus:ring-2 "
            />

            <button
              type="submit"
              className="bg-neutral-700 hover:bg-neutral-800 text-white ml-2 px-4 py-2 rounded-full transition"
            >
              Buscar
            </button>
          </form>
        </div>

        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="flex gap-4"
          columnClassName="bg-clip-padding"
        >
          {photos.map((photo) => (
            <div key={photo.id} className="p-4">
              <div className="relative rounded-lg overflow-hidden shadow-lg transform transition duration-300 hover:scale-105">
                <img
                  src={photo.urls.small}
                  alt={photo.alt_description || "photo"}
                  className="w-[98%] h-auto object-cover cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                />

                <div className="absolute bottom-0 left-0 w-full p-2 flex justify-between items-center text-sm">
                  <span className="truncate max-w-[55%] text-white">{photo.user.name}</span>

                  <div className="flex items-center gap-2">
                    <span className="opacity-90 text-white">
                      ❤️ {likes[photo.id] ?? photo.likes ?? 0}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFollow(photo.user.username);
                      }}
                      className={`px-2 py-1 rounded text-xs transition text-white ${following[photo.user.username]
                        ? "bg-gray-500"
                        : ""
                        }`}
                    >
                      {following[photo.user.username] ? "Seguindo" : "Seguir"}
                    </button>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(photo);
                  }}
                  className={`absolute top-2 right-2 rounded-full px-3 py-1 text-xs font-medium shadow ${liked[photo.id]
                    ? "text-red-600"
                    :"text-white bg-black/40 hover:bg-black/80"
                    }`}
                  aria-label="Curtir"
                  title="Curtir"
                >
                  {liked[photo.id] ? "♥" : "♡"}
                </button>
              </div>
            </div>
          ))}
        </Masonry>

        <div ref={loaderRef} className="h-10" />

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
                  alt={selectedPhoto.alt_description || "photo"}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              </div>

              <div className="p-4 text-gray-800">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-xl font-bold">{selectedPhoto.user.name}</h2>
                    <p className="text-gray-600 text-sm">
                      {selectedPhoto.alt_description || " "}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleLike(selectedPhoto)}
                      className={`px-3 py-2 rounded transition text-sm ${liked[selectedPhoto.id]
                        ? "bg-neutral-800 text-white"
                        : "bg-neutral-700 hover:bg-neutral-800 text-white"
                        }`}
                    >
                      {liked[selectedPhoto.id] ? "♥ Curtido" : "♡ Curtir"} (
                      {likes[selectedPhoto.id] ??
                        selectedPhoto.likes ??
                        0})
                    </button>
                  </div>
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  Fonte: Unsplash • @{selectedPhoto.user.username}
                </div>
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
