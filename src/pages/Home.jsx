import { useState, useEffect } from "react";
import { auth } from "../firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

import { Alert, AlertTitle, AlertDescription } from "../components/ui/alert";

export default function Home() {
  const [modoCadastro, setModoCadastro] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null); 

  const navigate = useNavigate();

  const images = [
    "https://images.unsplash.com/photo-1508672019048-805c876b67e2",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
    "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d",
    "https://images.unsplash.com/photo-1472653431158-6364773b2a56",
    "https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4",
    "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce",
    "https://images.unsplash.com/photo-1504386106331-3e4e71712b38",
  ];

  // Fechar alerta automaticamente após 3 segundos
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setAlert(null);

    try {
      if (modoCadastro) {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          senha
        );

        const user = userCredential.user;
        await updateProfile(user, { displayName: nome });

        setAlert({
          type: "default",
          title: "Cadastro realizado!",
          message: "Sua conta foi criada com sucesso.",
        });

        setNome("");
        setEmail("");
        setSenha("");
        setModoCadastro(false);
      } else {
        await signInWithEmailAndPassword(auth, email, senha);
        navigate("/search");
      }
    } catch (err) {
      setAlert({
        type: "destructive",
        title: "Erro",
        message: err.message,
      });
    }

    setLoading(false);
  };

  const handleResetSenha = async () => {
    if (!email) {
      setAlert({
        type: "destructive",
        title: "Atenção",
        message: "Informe seu email para resetar a senha.",
      });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setAlert({
        type: "default",
        title: "Sucesso",
        message: "Email de recuperação enviado!",
      });
    } catch (err) {
      setAlert({
        type: "destructive",
        title: "Erro",
        message: err.message,
      });
    }
  };

  return (
    <div className="relative min-w-screen min-h-screen overflow-hidden">
      {/* Fundo com imagens */}
      <div className="w-[100%] md:w-[60%] mx-auto absolute inset-0 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1">
        {images.map((src, i) => (
          <img
            key={i}
            src={`${src}?auto=format&fit=crop&w=500&q=60`}
            alt={`Background ${i}`}
            className="w-[50%] h-[50%] my-auto mx-auto object-cover bg-black"
          />
        ))}
      </div>

      {/* Overlay escuro */}
      <div className="relative inset-0 bg-black/50"></div>

      {/* Modal de alerta centralizado */}
      {alert && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60">
          <div className="max-w-sm w-full mx-4">
            <Alert variant={alert.type}>
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Conteúdo com logo e formulário */}
      <div className="relative flex flex-col items-center justify-center h-full p-6">
        {/* Logo */}
        <div className="bg-black shadow-lg rounded-full p-4 mb-6">
          <img
            src="/logo3.png"
            alt="Logo"
            className="w-16 h-14 text-blue-600"
          />
        </div>

        {/* Formulário */}
        <form
          onSubmit={handleSubmit}
          className="bg-black/80 backdrop-blur-md p-8 rounded-xl shadow-lg w-80 text-white"
        >
          <h1 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-white to-gray-400 text-transparent bg-clip-text">
            Photos Shared
          </h1>

          {modoCadastro && (
            <input
              type="text"
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full mb-4 p-2 rounded bg-white/20 placeholder-gray-300 text-white outline-none"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 p-2 rounded bg-white/20 placeholder-gray-300 text-white outline-none"
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full mb-2 p-2 rounded bg-white/20 placeholder-gray-300 text-white outline-none"
            required
          />

          {!modoCadastro && (
            <div className="text-sm text-right mb-6">
              <p
                className="hover:underline cursor-pointer"
                onClick={handleResetSenha}
              >
                Esqueceu sua senha?
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded text-white hover:bg-neutral-800 transition mb-4 disabled:opacity-50"
          >
            {loading ? "Aguarde..." : modoCadastro ? "Cadastrar" : "Entrar"}
          </button>

          <div className="text-center text-sm">
            {modoCadastro ? (
              <>
                Já tem conta?{" "}
                <span
                  className="hover:underline cursor-pointer"
                  onClick={() => setModoCadastro(false)}
                >
                  Faça login
                </span>
              </>
            ) : (
              <>
                Não tem conta?{" "}
                <span
                  className="hover:underline cursor-pointer"
                  onClick={() => setModoCadastro(true)}
                >
                  Cadastre-se
                </span>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
