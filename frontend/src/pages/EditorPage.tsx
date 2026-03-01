import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import * as monaco from "monaco-editor";
import { Users, History, Save, ChevronLeft, FileCode, UserPlus, Play, Terminal, Circle } from "lucide-react";
import { FileTree } from "../components/FileTree";

export default function EditorPage() {
    const { id } = useParams();
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const editorRef = useRef<HTMLDivElement>(null);
    const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);

    // File System State
    const [fileMap, setFileMap] = useState<Y.Map<any> | null>(null);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const activeBindingRef = useRef<MonacoBinding | null>(null);
    const [activeUsers, setActiveUsers] = useState<any[]>([]);
    const [ydocState, setYdocState] = useState<Y.Doc>(new Y.Doc());

    // Version History States
    const [showHistory, setShowHistory] = useState(false);
    // const [historyItems, setHistoryItems] = useState<any[]>([]);
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

        // Handle File Map System
        const map = ydoc.getMap("filetree");
        setFileMap(map);

        const checkAndInitFiles = () => {
            const keysArray = Array.from(map.keys());
            if (keysArray.length === 0 && provider.wsconnected) {
                // If completely empty after connecting, initialize root
                const initId = "root_index_ts";
                ydoc.transact(() => {
                    map.set(initId, { name: "index.ts", type: "file", parentId: null });
                    ydoc.getText(initId).insert(0, "// Welcome to your collaborative workspace\n");
                });
                setActiveFileId(initId);
            } else if (!activeFileId && keysArray.length > 0) {
                // Try to find the first file to auto-open
                const firstFile = keysArray.find(k => (map.get(k) as any).type === "file");
                if (firstFile) setActiveFileId(firstFile);
            }
        };

        // Run immediately in case data already synced
        checkAndInitFiles();

        // And listen for future syncs/changes
        map.observe(checkAndInitFiles);
        provider.on("sync", checkAndInitFiles);

        // Initialize Monaco Editor Frame
        if (editorRef.current && !monacoRef.current) {
            monacoRef.current = monaco.editor.create(editorRef.current, {
                value: "",
                language: "typescript",
                theme: "vs-dark",
                automaticLayout: true,
                minimap: { enabled: true, renderCharacters: false, scale: 0.75 },
                padding: { top: 16 }
            });
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

    // Handle File Switching Dynamics
    useEffect(() => {
        if (!activeFileId || !monacoRef.current || !ydocState || showHistory) return;

        // Cleanup old binding instantly
        if (activeBindingRef.current) {
            activeBindingRef.current.destroy();
            activeBindingRef.current = null;
        }

        const editor = monacoRef.current;
        const yText = ydocState.getText(activeFileId);

        // Map extension to Monaco Language
        let lang = "typescript";
        const filename = fileMap?.get(activeFileId)?.name || "";
        if (filename.endsWith(".css")) lang = "css";
        if (filename.endsWith(".html")) lang = "html";
        if (filename.endsWith(".json")) lang = "json";

        // Create fresh model
        const model = monaco.editor.createModel(yText.toString(), lang);
        editor.setModel(model);

        // Bind the specific file's CRDT
        // Note: provider.awareness doesn't work perfectly when switching models rapidly, 
        // a more robust app would isolate awareness instances per file
        activeBindingRef.current = new MonacoBinding(
            yText,
            model,
            new Set([editor])
        );

    }, [activeFileId, ydocState, fileMap, showHistory]);
    const fetchHistory = async () => {
        const res = await fetch(`http://localhost:3001/api/documents/${id}/history`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const items = await res.json();
            // Automatically select the latest history item if available
            if (items.length > 0) {
                setSelectedHistory(items[0]);
            }
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

            // Diffing on Workspace level is extremely complex (many files)
            // For MVP, we extract the currently active file from the snapshot
            const targetId = activeFileId || "monaco";
            const pastText = pastDoc.getText(targetId).toString();
            const currentText = ydocState.getText(targetId).toString();

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
        <div className="flex h-screen overflow-hidden bg-[#0d121c] text-slate-300 font-sans selection:bg-blue-500/30">

            {/* Left Activity Bar (Icons) */}
            <div className="w-12 bg-[#0a0f18] border-r border-[#1e293b] flex flex-col items-center py-4 gap-6 z-30">
                <button onClick={() => navigate("/")} className="text-slate-400 hover:text-white transition-colors"><ChevronLeft size={24} /></button>
                <button className="text-white relative"><FileCode size={22} /><span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-full"></span></button>
                <button className="text-slate-500 hover:text-slate-300 transition-colors"><Users size={22} /></button>
            </div>

            {/* Main Sidebar (File Tree / History) */}
            <div className="w-64 bg-[#111622] border-r border-[#1e293b] flex flex-col shadow-2xl relative z-20">
                {fileMap ? (
                    <FileTree fileMap={fileMap} activeFileId={activeFileId} onSelectFile={setActiveFileId} ydoc={ydocState} />
                ) : (
                    <div className="p-4 text-xs text-slate-500">Connecting to File System...</div>
                )}
            </div>

            {/* Main Editor Environment */}
            <div className="flex-1 flex flex-col relative z-10 w-full min-w-0 bg-[#1e1e1e]">

                {/* Top IDE Header */}
                <header className="h-10 bg-[#181818] border-b border-[#2d2d2d] flex items-center justify-between px-3 shrink-0">
                    <div className="flex bg-[#1e1e1e] h-full items-center px-4 min-w-[150px] border-t-2 border-t-blue-500 border-r border-r-[#2d2d2d] border-l border-l-[#2d2d2d] cursor-pointer">
                        <FileCode size={14} className="text-yellow-400 mr-2" />
                        <span className="text-sm font-medium text-slate-200 truncate">{fileMap?.get(activeFileId!)?.name || "Initializing..."}</span>
                        <span className="ml-4 p-1 hover:bg-slate-700 rounded-md text-slate-400"><Circle fill="currentColor" size={8} /></span>
                    </div>

                    {/* Toolbar Buttons */}
                    <div className="flex items-center gap-2 pr-2">
                        <button onClick={inviteUser} className="text-xs flex items-center gap-1.5 px-3 py-1 bg-[#2d2d3d] hover:bg-[#3d3d4d] text-indigo-300 rounded border border-[#4d4d6d] transition-colors"><UserPlus size={14} /> Share</button>
                        <button onClick={saveSnapshot} className="text-xs flex items-center gap-1.5 px-3 py-1 bg-[#1e1e1e] hover:bg-[#2d2d2d] text-slate-300 rounded border border-[#3d3d3d] transition-colors"><Save size={14} className="text-slate-400" /> Save</button>
                        <button onClick={toggleHistory} className="text-xs flex items-center gap-1.5 px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded border border-blue-500/30 transition-colors ml-2"><History size={14} /> Diff</button>
                    </div>
                </header>

                {/* Editor Container */}
                <div className="flex-1 w-full relative">
                    <div ref={editorRef} className="absolute inset-0" />
                </div>

                {/* Bottom Status Panel */}
                <div className="h-6 bg-blue-600 flex items-center justify-between px-3 text-white text-[11px] shrink-0 font-mono tracking-wide shadow-[0_-2px_10px_rgba(0,0,0,0.5)] z-20">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 hover:bg-white/10 px-1 py-0.5 rounded cursor-pointer transition-colors">
                            <Play size={10} /> Prettier
                        </span>
                        <span className="flex items-center gap-1.5 hover:bg-white/10 px-1 py-0.5 rounded cursor-pointer transition-colors">
                            <Terminal size={12} /> Live Server: Port 5173
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span>UTF-8</span>
                        <span>{fileMap?.get(activeFileId!)?.name?.split('.').pop()?.toUpperCase() || "TYPESCRIPT"}</span>
                        <span className="flex items-center gap-1">
                            {activeUsers.length} <Users size={12} className="opacity-80 mx-1" /> ONLINE
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
