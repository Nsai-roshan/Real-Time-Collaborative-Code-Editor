import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import * as monaco from "monaco-editor";
import { Users, History, Save, ChevronLeft, FileCode, UserPlus } from "lucide-react";

export default function EditorPage() {
    const { id } = useParams();
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const editorRef = useRef<HTMLDivElement>(null);
    const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
    const [activeUsers, setActiveUsers] = useState<any[]>([]);
    const [ydocState, setYdocState] = useState<Y.Doc>(new Y.Doc());

    // Version History States
    const [showHistory, setShowHistory] = useState(false);
    const [historyItems, setHistoryItems] = useState<any[]>([]);
    const [selectedHistory, setSelectedHistory] = useState<any>(null);

    useEffect(() => {
        if (!id || !user || !token) {
            navigate("/");
            return;
        }

        // Initialize Yjs Document
        const ydoc = new Y.Doc();
        setYdocState(ydoc);

        // Create WebSocket provider
        const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:3001";
        const provider = new WebsocketProvider(wsUrl, `${id}?token=${token}`, ydoc);

        // Set user awareness (presence)
        provider.awareness.setLocalStateField("user", {
            name: user.name || user.email,
            color: "#" + Math.floor(Math.random() * 16777215).toString(16) // Random color
        });

        provider.awareness.on("change", () => {
            const states = Array.from(provider.awareness.getStates().values());
            setActiveUsers(states.map((s: any) => s.user).filter(Boolean));
        });

        // Initialize Monaco Editor
        if (editorRef.current && !monacoRef.current) {
            const editor = monaco.editor.create(editorRef.current, {
                value: "",
                language: "typescript",
                theme: "vs-dark",
                automaticLayout: true,
                minimap: { enabled: false }
            });
            monacoRef.current = editor;

            // Bind Yjs to Monaco
            const yText = ydoc.getText("monaco");
            new MonacoBinding(
                yText,
                editor.getModel()!,
                new Set([editor]),
                provider.awareness
            );
        }

        return () => {
            provider.disconnect();
            ydoc.destroy();
            monacoRef.current?.dispose();
            monacoRef.current = null;
            diffEditorRef.current?.dispose();
            diffEditorRef.current = null;
        };
    }, [id, user, token, navigate]);

    // Fetch Version History
    const fetchHistory = async () => {
        const res = await fetch(`http://localhost:3001/api/documents/${id}/history`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            setHistoryItems(await res.json());
        }
    };

    const toggleHistory = async () => {
        if (!showHistory) {
            await fetchHistory();
            // Destroy normal editor instance before showing diff
            monacoRef.current?.dispose();
            monacoRef.current = null;
        } else {
            // Destroy diff editor when closing history
            diffEditorRef.current?.dispose();
            diffEditorRef.current = null;
            setSelectedHistory(null);
        }
        setShowHistory(!showHistory);
    };

    const saveSnapshot = async () => {
        const reason = prompt("Enter a name for this version:");
        if (!reason) return;
        await fetch(`http://localhost:3001/api/documents/${id}/history`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ reason })
        });
        alert("Version saved!");
        if (showHistory) fetchHistory();
    };

    const inviteUser = async () => {
        const email = prompt("Enter the email address of the user to invite:");
        if (!email) return;

        const res = await fetch(`http://localhost:3001/api/documents/${id}/invite`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        const data = await res.json();
        if (res.ok) {
            alert(data.message);
        } else {
            alert(data.error || "Failed to invite user");
        }
    };

    // Render Diff Editor
    useEffect(() => {
        if (showHistory && selectedHistory && editorRef.current) {
            // Decode the selected history from Buffer Bytes
            const uint8 = Uint8Array.from(selectedHistory.snapshot.data);
            const pastDoc = new Y.Doc();
            Y.applyUpdate(pastDoc, uint8);
            const pastText = pastDoc.getText("monaco").toString();
            const currentText = ydocState.getText("monaco").toString();

            if (!diffEditorRef.current) {
                diffEditorRef.current = monaco.editor.createDiffEditor(editorRef.current, {
                    theme: "vs-dark",
                    automaticLayout: true,
                    readOnly: true
                });
            }

            const originalModel = monaco.editor.createModel(pastText, "typescript");
            const modifiedModel = monaco.editor.createModel(currentText, "typescript");
            diffEditorRef.current.setModel({ original: originalModel, modified: modifiedModel });
        }
    }, [selectedHistory, showHistory]);

    return (
        <div className="flex h-screen overflow-hidden bg-[#0a0f1a] text-slate-300 font-sans selection:bg-blue-500/30">
            {/* Sidebar for Users / History */}
            <div className="w-72 bg-[#0f1523] border-r border-slate-800/50 flex flex-col shadow-2xl relative z-20">
                <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-gradient-to-r from-[#0f1523] to-[#151c2e]">
                    <h2 className="font-bold text-slate-200 uppercase tracking-widest text-xs flex items-center gap-2">
                        {showHistory ? <><History size={14} className="text-purple-400" /> Version History</> : <><Users size={14} className="text-blue-400" /> Collaborators</>}
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {!showHistory ? (
                        activeUsers.map((u, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors cursor-default group">
                                <div className="relative">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-slate-800 group-hover:ring-slate-700 transition-all" style={{ backgroundColor: u.color }}>
                                        {u.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-[#0f1523] rounded-full"></div>
                                </div>
                                <span className="text-slate-300 text-sm font-medium truncate group-hover:text-white transition-colors">{u.name}</span>
                            </div>
                        ))
                    ) : (
                        historyItems.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedHistory(item)}
                                className={`p-3 rounded-xl cursor-pointer border transition-all duration-300 ${selectedHistory?.id === item.id ? 'bg-purple-500/10 border-purple-500/30 shadow-inner' : 'bg-slate-800/20 border-transparent hover:bg-slate-800/50 hover:border-slate-700'}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg ${selectedHistory?.id === item.id ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-400'}`}>
                                        <History size={16} />
                                    </div>
                                    <div>
                                        <p className={`font-semibold text-sm ${selectedHistory?.id === item.id ? 'text-purple-300' : 'text-slate-200'}`}>{item.reason || "Auto Save"}</p>
                                        <p className="text-xs text-slate-500 mt-1">{new Date(item.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Editor */}
            <div className="flex-1 flex flex-col relative z-10 w-full">
                <header className="h-14 border-b border-slate-800/80 bg-[#0f1523]/80 backdrop-blur-md flex items-center px-4 justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate("/")} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors group">
                            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div className="h-6 w-px bg-slate-700/50"></div>
                        <span className="text-slate-300 font-mono text-sm flex items-center gap-3">
                            <FileCode size={18} className="text-blue-500" />
                            <span>Room: <span className="text-slate-400">{id}</span></span>
                            {showHistory && selectedHistory && (
                                <>
                                    <span className="text-slate-600">/</span>
                                    <span className="text-purple-400 font-semibold flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                                        </span>
                                        Viewing Diff: {selectedHistory.reason}
                                    </span>
                                </>
                            )}
                        </span>
                    </div>

                    <div className="flex gap-3">
                        {!showHistory && (
                            <>
                                <button
                                    onClick={inviteUser}
                                    className="flex items-center gap-2 text-sm bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/40 hover:text-indigo-300 px-4 py-2 rounded-lg transition-all shadow-sm active:scale-95"
                                >
                                    <UserPlus size={16} />
                                    Share
                                </button>
                                <button
                                    onClick={saveSnapshot}
                                    className="flex items-center gap-2 text-sm bg-slate-800/80 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 px-4 py-2 rounded-lg text-slate-200 transition-all shadow-sm active:scale-95"
                                >
                                    <Save size={16} className="text-blue-400" />
                                    Save Version
                                </button>
                            </>
                        )}
                        <button
                            onClick={toggleHistory}
                            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg text-white transition-all shadow-md active:scale-95 ${showHistory ? 'bg-slate-700 hover:bg-slate-600 border border-slate-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-500/50 shadow-blue-500/20'}`}
                        >
                            <History size={16} className={showHistory ? 'text-slate-300' : 'text-blue-200'} />
                            {showHistory ? "Exit History" : "Version History"}
                        </button>
                    </div>
                </header>

                {/* Editor Container */}
                <div className="flex-1 w-full relative bg-[#1e1e1e]">
                    <div ref={editorRef} className="absolute inset-0" />
                </div>
            </div>
        </div>
    );
}
