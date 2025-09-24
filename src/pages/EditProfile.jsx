import React, { useState, useEffect } from "react";
import { auth } from "../firebaseConfig";
import {
    updateProfile,
    updateEmail,
    updatePassword,
    deleteUser,
    onAuthStateChanged,
} from "firebase/auth";
import Header from "../components/Header";
import { Alert, AlertDescription } from "../components/ui/alert";

export default function EditProfile() {
    const [user, setUser] = useState(null);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [alert, setAlert] = useState({ show: false, message: "", variant: "default" });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setName(currentUser.displayName || "");
                setEmail(currentUser.email || "");
            }
        });

        return () => unsubscribe();
    }, []);

    const showAlert = (message, variant = "default") => {
        setAlert({ show: true, message, variant });
        setTimeout(() => {
            setAlert({ show: false, message: "", variant: "default" });
        }, 3000);
    };

    const handleUpdate = async () => {
        if (!user) return;

        try {
            if (name && name !== user.displayName) {
                await updateProfile(user, { displayName: name });
            }

            if (email && email !== user.email) {
                await updateEmail(user, email);
            }

            if (password) {
                await updatePassword(user, password);
            }

            showAlert("Perfil atualizado com sucesso ✅", "default");
        } catch (error) {
            console.error(error);
            showAlert("Erro ao atualizar perfil: " + error.message, "destructive");
        }
    };

    const handleDelete = async () => {
        if (!user) return;

        try {
            await deleteUser(user);
            showAlert("Conta deletada com sucesso 🚨", "destructive");
        } catch (error) {
            console.error(error);
            showAlert("Erro ao deletar conta: " + error.message, "destructive");
        }
    };

    return (
        <>
            <Header />
            
            {/* Modal do Alert */}
            {alert.show && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                    <Alert variant={alert.variant} className="w-[90%] max-w-md shadow-lg">
                        <AlertDescription>{alert.message}</AlertDescription>
                    </Alert>
                </div>
            )}

            <div className="min-h-screen min-w-screen flex items-center justify-center p-4">
                <div className="p-6 rounded-xl shadow-md w-full max-w-md mt-4">
                    <h2 className="text-2xl font-bold text-center mb-4">
                        Editar Perfil
                    </h2>

                    <div className="space-y-4 border border-neutral-700 rounded-lg p-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium">Nome</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Novo nome"
                                className="w-full p-2 border border-neutral-700 rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-medium">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Novo email"
                                className="w-full p-2 border border-neutral-700 rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-medium">Nova Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Nova senha"
                                className="w-full p-2 border border-neutral-700 rounded-lg"
                            />
                        </div>

                        <button
                            onClick={handleUpdate}
                            className="w-full bg-neutral-800 hover:bg-neutral-900 text-white py-2 rounded-lg transition"
                        >
                            Salvar Alterações
                        </button>

                        <button
                            onClick={handleDelete}
                            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition mt-2"
                        >
                            Deletar Conta
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
