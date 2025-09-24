import { useNavigate, useLocation } from "react-router-dom";
import { FaHome, FaSearch, FaPlus, FaUser, FaMoon, FaSun } from "react-icons/fa";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../components/ui/dropdown-menu";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { useTheme } from "../contexts/ThemeContext";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 w-full backdrop-blur-2xl
  shadow z-50 flex items-center justify-between py-3 px-6 border-b border-neutral-800 dark:border-white">

      {/* Logo à esquerda */}
      <div className="">
        <img
          src="/logo3.png"
          alt="Logo"
          className="w-10 h-9 py-0.5 hover:scale-105"
        />
      </div>

      {/* Botões centralizados */}
      <nav className="flex gap-0.5 items-center mx-auto">
        {/* Home */}
        <button
          onClick={() => handleNavigation("/feed")}
          className="bg-neutral-800 text-white w-13.5 h-9 flex items-center justify-center 
          rounded-full transition hover:scale-105 hover:text-neutral-600"
        >
          <FaHome
            size={20}
            className={location.pathname === "/feed" ? "text-blue-500" : ""}
          />
        </button>

        {/* Search */}
        <button
          onClick={() => handleNavigation("/search")}
          className="bg-neutral-800 text-white w-13.5 h-10.5 flex items-center justify-center 
          rounded-full transition hover:scale-105 hover:text-neutral-600"
        >
          <FaSearch
            size={20}
            className={location.pathname === "/search" ? "text-blue-500" : ""}
          />
        </button>

        {/* Create Post */}
        <button
          onClick={() => handleNavigation("/create-post")}
          className="bg-neutral-800 text-white w-13.5 h-10.5 flex items-center justify-center 
          rounded-full transition hover:scale-105 hover:text-neutral-600"
        >
          <FaPlus
            size={18}
            className={location.pathname === "/create-post" ? "text-blue-500" : "hover:text-green-500"}
          />
        </button>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="bg-neutral-800 text-white w-13.5 h-9 flex items-center justify-center 
            rounded-full transition hover:scale-105 hover:text-neutral-600">
              <FaUser
                className={location.pathname.startsWith("/profile") || location.pathname.startsWith("/edit-profile")
                  ? "text-blue-500"
                  : ""
                }
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40 bg-black shadow-md rounded-md">
            <DropdownMenuItem
              onClick={() => navigate("/profile")}
              className="text-white cursor-pointer"
            >
              Ver perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("/edit-profile")}
              className="text-white cursor-pointer"
            >
              Editar perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-500 cursor-pointer"
            >
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
      {/* Botão de alternância de tema */}
      <button
          onClick={toggleTheme}
          className="bg-neutral-800 w-14 h-10 flex items-center justify-center 
          rounded-full transition hover:scale-105"
        >
          {theme === "light" ? (
            <FaMoon className="text-white" size={18} />
          ) : (
            <FaSun className="text-yellow-500" size={18} />
          )}
        </button>
    </header>
  );
}
