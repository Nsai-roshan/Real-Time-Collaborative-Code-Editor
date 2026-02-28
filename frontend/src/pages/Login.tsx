import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [isLogin, setIsLogin] = useState(true);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
        try {
            const res = await fetch(`http://localhost:3001${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, name: isLogin ? undefined : name }),
            });
            const data = await res.json();
            if (res.ok) {
                login(data.token, data.user);
                navigate("/");
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert("Failed to connect to server");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-blue-900 to-slate-900 overflow-hidden relative">
            {/* Animated background blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-2xl shadow-2xl w-full max-w-md relative z-10 transform transition-all duration-500 hover:scale-[1.01]">
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-lg shadow-blue-500/30">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                    </div>
                    <h2 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                        {isLogin ? "Welcome Back" : "Join Editor"}
                    </h2>
                    <p className="text-gray-400 mt-2 text-sm font-medium">
                        {isLogin ? "Sign in to continue collaborating" : "Create an account to start coding"}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {!isLogin && (
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Full Name"
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    )}
                    <div className="relative group">
                        <input
                            type="email"
                            placeholder="Email Address"
                            className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="relative group">
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full shadow-lg shadow-blue-600/30 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white p-4 rounded-xl font-bold tracking-wide transition-all duration-300 transform hover:-translate-y-1 mt-4"
                    >
                        {isLogin ? "Sign In" : "Create Account"}
                    </button>
                </form>
                <div className="mt-8 text-center">
                    <button
                        className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                        onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); }}
                    >
                        {isLogin ? "New here? " : "Already registered? "}
                        <span className="text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-500/30">
                            {isLogin ? "Create an account" : "Sign in to an existing account"}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
