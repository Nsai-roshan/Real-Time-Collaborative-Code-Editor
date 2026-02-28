import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FilePlus, FileCode2, LogOut, Trash2 } from "lucide-react";

interface Document {
    id: string;
    title: string;
    updatedAt: string;
}

export default function Dashboard() {
    const { user, token, logout } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDocs = async () => {
            const res = await fetch("http://localhost:3001/api/documents", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        };
        fetchDocs();
    }, [token]);

    const createDocument = async () => {
        const res = await fetch("http://localhost:3001/api/documents", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ title: "Untitled Document" })
        });
        if (res.ok) {
            const doc = await res.json();
            navigate(`/document/${doc.id}`);
        }
    };

    const deleteDocument = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent opening the document
        if (!confirm("Are you sure you want to delete this document?")) return;

        const res = await fetch(`http://localhost:3001/api/documents/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
            setDocuments(documents.filter(doc => doc.id !== id));
        } else {
            const data = await res.json();
            alert(data.error || "Failed to delete document");
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] text-slate-200 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <header className="flex justify-between items-center mb-12 bg-white/5 p-6 rounded-2xl backdrop-blur-md border border-white/5 shadow-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <FileCode2 className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                                My Workspace
                            </h1>
                            <p className="text-sm text-slate-400 mt-1 font-medium">Signed in as <span className="text-slate-300">{user?.name || user?.email}</span></p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="group flex items-center gap-2 px-5 py-2.5 bg-slate-800/50 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 rounded-xl text-slate-300 hover:text-red-400 transition-all duration-300 shadow-md"
                    >
                        <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-semibold text-sm tracking-wide">Disconnect</span>
                    </button>
                </header>

                {/* Document Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {/* Create New Card */}
                    <div
                        onClick={createDocument}
                        className="group relative flex flex-col items-center justify-center p-8 bg-slate-800/20 hover:bg-blue-600/10 border-2 border-dashed border-slate-700 hover:border-blue-500/50 rounded-2xl cursor-pointer transition-all duration-300 aspect-[4/3] overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="bg-slate-800 group-hover:bg-blue-500 p-4 rounded-full mb-4 shadow-lg transition-colors duration-300 transform group-hover:scale-110">
                            <FilePlus size={32} className="text-blue-400 group-hover:text-white transition-colors" />
                        </div>
                        <span className="font-bold text-lg text-slate-300 group-hover:text-blue-300 tracking-wide transition-colors">Start Blank</span>
                    </div>

                    {/* Existing Documents */}
                    {documents.map((doc) => (
                        <div
                            key={doc.id}
                            onClick={() => navigate(`/document/${doc.id}`)}
                            className="group relative bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 hover:border-blue-500/50 rounded-2xl p-6 cursor-pointer transition-all duration-300 flex flex-col justify-between aspect-[4/3] shadow-lg hover:shadow-xl hover:shadow-blue-900/20 hover:-translate-y-1 overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors"></div>

                            <div className="relative z-10 flex justify-between items-start">
                                <div>
                                    <div className="p-3 bg-slate-900/50 rounded-xl inline-block mb-4 border border-slate-700">
                                        <FileCode2 size={24} className="text-indigo-400" />
                                    </div>
                                    <h3 className="font-bold text-xl text-slate-200 truncate group-hover:text-white transition-colors pr-2">{doc.title}</h3>
                                </div>

                                {/* Delete Button */}
                                <button
                                    onClick={(e) => deleteDocument(e, doc.id)}
                                    className="p-2 -mr-2 -mt-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Delete Document"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="relative z-10 flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
                                <span className="text-xs font-medium text-slate-500 bg-slate-900/50 px-2 py-1 rounded-md">
                                    {new Date(doc.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
