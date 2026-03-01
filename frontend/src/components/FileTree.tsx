import { useState, useEffect } from "react";
import * as Y from "yjs";
import { ChevronRight, ChevronDown, FileCode, Folder, FolderOpen, File as FileIcon } from "lucide-react";

export interface FileNode {
    id: string;
    name: string;
    type: "file" | "folder";
    parentId: string | null;
}

interface FileTreeProps {
    fileMap: Y.Map<any>;
    activeFileId: string | null;
    onSelectFile: (id: string) => void;
    ydoc: Y.Doc;
}

export function FileTree({ fileMap, activeFileId, onSelectFile, ydoc }: FileTreeProps) {
    const [nodes, setNodes] = useState<FileNode[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["root"]));

    // Sync Yjs Map into local React state for rendering
    useEffect(() => {
        const updateNodes = () => {
            const arr: FileNode[] = [];
            fileMap.forEach((value, key) => {
                arr.push({ id: key, ...value });
            });
            // Default sort: folders first, then alphabetically
            arr.sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === "folder" ? -1 : 1;
            });
            setNodes(arr);
        };

        updateNodes();
        fileMap.observe(updateNodes);
        return () => fileMap.unobserve(updateNodes);
    }, [fileMap]);

    const toggleFolder = (id: string) => {
        const newSet = new Set(expandedFolders);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedFolders(newSet);
    };

    const createNode = (type: "file" | "folder", parentId: string | null = null) => {
        const name = prompt(`Enter ${type} name:`);
        if (!name) return;

        const id = Math.random().toString(36).substr(2, 9);

        ydoc.transact(() => {
            fileMap.set(id, { name, type, parentId });
            if (type === "file") {
                ydoc.getText(id).insert(0, ""); // Initialize empty text
            }
        });

        if (parentId) {
            setExpandedFolders(prev => new Set(prev).add(parentId));
        }

        if (type === "file") onSelectFile(id);
    };

    const renderTree = (parentId: string | null, depth = 0) => {
        const children = nodes.filter(n => n.parentId === parentId);
        if (children.length === 0 && depth === 0 && nodes.length === 0) {
            return <div className="text-xs text-slate-500 italic p-4 text-center">No files yet. Create one!</div>
        }

        return children.map(node => {
            const isExpanded = expandedFolders.has(node.id);
            const isActive = activeFileId === node.id;

            return (
                <div key={node.id} className="w-full">
                    <div
                        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer text-sm whitespace-nowrap
                        ${isActive ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
                        style={{ paddingLeft: `${depth * 12 + 8}px` }}
                        onClick={() => {
                            if (node.type === "folder") toggleFolder(node.id);
                            else onSelectFile(node.id);
                        }}
                    >
                        {node.type === "folder" ? (
                            <div className="flex items-center gap-1.5 w-full">
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                {isExpanded ? <FolderOpen size={14} className="text-yellow-500/80" /> : <Folder size={14} className="text-yellow-600/80" />}
                                <span className="truncate flex-1">{node.name}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 pl-4 w-full">
                                <FileCode size={14} className={isActive ? 'text-blue-400' : 'text-slate-500'} />
                                <span className="truncate flex-1">{node.name}</span>
                            </div>
                        )}
                    </div>
                    {node.type === "folder" && isExpanded && (
                        <div>{renderTree(node.id, depth + 1)}</div>
                    )}
                </div>
            );
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#111622] overflow-hidden select-none">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/50">
                <span className="text-xs font-bold text-slate-300 tracking-wider">PROJECT</span>
                <div className="flex gap-1">
                    <button onClick={() => createNode("file")} className="p-1 hover:bg-slate-700/50 rounded text-slate-400 hover:text-white" title="New File"><FileIcon size={14} /></button>
                    <button onClick={() => createNode("folder")} className="p-1 hover:bg-slate-700/50 rounded text-slate-400 hover:text-white" title="New Folder"><Folder size={14} /></button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-[250px] scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-transparent">
                <div className="py-2">
                    {renderTree(null)}
                </div>
            </div>
        </div>
    );
}
