import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Feed from "./pages/Feed";
import Search from "./pages/Search";
import Create from "./pages/Create";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Home from "./pages/Home";
import { useFirebaseAuth } from "../src/data/hooks/useFirebaseAuth";

export default function App() {
  const { user, loading } = useFirebaseAuth();

  if (loading) return <div className="flex justify-center items-center h-screen">Carregando...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/feed"
          element={user ? <Feed /> : <Navigate to="/" />}
        />
        <Route
          path="/search"
          element={user ? <Search /> : <Navigate to="/" />}
        />
        <Route
          path="/create-post"
          element={user ? <Create /> : <Navigate to="/" />}
        />
        <Route
          path="/profile"
          element={user ? <Profile /> : <Navigate to="/" />}
        />
        <Route
          path="/edit-profile"
          element={user ? <EditProfile /> : <Navigate to="/" />}
        />
      </Routes>
    </BrowserRouter>
  );
}