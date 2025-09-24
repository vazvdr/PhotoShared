import React, { useState, useEffect } from "react";
import { auth } from "../firebaseConfig";
import { uploadPhoto } from "../services/PhotoService";
import Header from "../components/Header";
import { Upload } from "lucide-react";

export default function UploadPhoto({ onUpload }) {
    const [file, setFile] = useState(null);
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleUpload = async () => {
        if (!file) return alert("Selecione uma foto!");
        setLoading(true);
        setMessage(null);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return alert("Você precisa estar logado");

            const { photoURL } = await uploadPhoto(
                currentUser.uid,
                file,
                description
            );
            onUpload?.(photoURL);

            setFile(null);
            setDescription("");
            setMessage({ type: "success", text: "✅ Foto postada com sucesso!" });
        } catch (e) {
            console.error("Erro ao enviar foto:", e);
            setMessage({ type: "error", text: "❌ Erro ao postar a foto!" });
        }
        setLoading(false);
    };

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    return (
        <>
            <Header />
            <div className="min-h-screen min-w-screen flex flex-col items-center justify-center">
                {/* 🔹 Título centralizado */}
                <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-neutral-800 to-gray-400 text-transparent bg-clip-text">
                    Create Post
                </h1>

                <div className="p-6 border w-[90%] sm:w-[70%] md:w-[50%] lg:w-[30%] border-gray-800 dark:border-gray-700 rounded-lg shadow-lg flex flex-col gap-4">

                    {/* Input de imagem estilizado */}
                    <label
                        htmlFor="fileUpload"
                        className="flex flex-col items-center justify-center border-2 border-dashed border-gray-400 rounded-lg p-6 cursor-pointer hover:border-white transition"
                    >
                        <Upload size={40} className="text-gray-500 mb-2" />
                        <span className="">
                            Clique aqui para enviar uma foto
                        </span>
                        <input
                            id="fileUpload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => setFile(e.target.files[0])}
                        />
                    </label>

                    {/* Nome da foto escolhida */}
                    {file && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
                            📷 {file.name}
                        </p>
                    )}

                    {/* Descrição */}
                    <input
                        type="text"
                        placeholder="Descrição (opcional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="border border-gray-600 rounded p-2"
                    />

                    {/* Botão */}
                    <button
                        onClick={handleUpload}
                        disabled={loading}
                        className="bg-neutral-700 text-white px-4 py-2 rounded-lg hover:bg-neutral-800 disabled:bg-gray-400"
                    >
                        {loading ? "Enviando..." : "Postar"}
                    </button>

                    {/* Mensagem de sucesso ou erro */}
                    {message && (
                        <p
                            className={`text-center font-medium transition-opacity duration-500 ${message.type === "success"
                                ? "text-green-600"
                                : "text-red-600"
                                }`}
                        >
                            {message.text}
                        </p>
                    )}
                </div>
            </div>
        </>
    );
}
