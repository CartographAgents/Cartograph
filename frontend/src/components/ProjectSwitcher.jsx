import React, { useState, useRef, useEffect } from 'react';
import { fetchAllProjects, deleteProject, archiveProject } from '../services/apiService';
import DeleteProjectModal from './DeleteProjectModal';
import Skeleton from './common/Skeleton';

const ChevronDown = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="chevron">
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
);

const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
);

const PlusIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

export default function ProjectSwitcher({ currentProjectId, currentProjectName, onSelectProject, onNewProject }) {
    const [projects, setProjects] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [projectToConfirm, setProjectToConfirm] = useState(null);
    const [hasFetched, setHasFetched] = useState(false);
    const containerRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const loadProjects = async () => {
        setLoading(true);
        try {
            const data = await fetchAllProjects();
            setProjects(data);
        } catch (err) {
            console.error('Failed to load projects:', err);
        } finally {
            setLoading(false);
            setHasFetched(true);
        }
    };

    const handleToggle = () => {
        const next = !isOpen;
        setIsOpen(next);
        if (next && !hasFetched) {
            loadProjects();
        }
    };

    const handleSelect = (id) => {
        onSelectProject(id);
        setIsOpen(false);
    };

    const handleDeleteTrigger = (e, project) => {
        e.stopPropagation();
        setProjectToConfirm(project);
    };

    const handleArchive = async () => {
        if (!projectToConfirm) return;
        try {
            await archiveProject(projectToConfirm.id);
            setProjects(projects.filter(p => p.id !== projectToConfirm.id));
            setProjectToConfirm(null);
        } catch (err) {
            alert('Failed to archive project: ' + err.message);
        }
    };

    const handleDeletePermanent = async () => {
        if (!projectToConfirm) return;
        try {
            await deleteProject(projectToConfirm.id);
            setProjects(projects.filter(p => p.id !== projectToConfirm.id));
            setProjectToConfirm(null);
        } catch (err) {
            alert('Failed to delete project: ' + err.message);
        }
    };

    const displayName = currentProjectName || 'Select a project';

    return (
        <div className="project-switcher" ref={containerRef}>
            <button
                className={`project-switcher-btn ${isOpen ? 'open' : ''}`}
                onClick={handleToggle}
            >
                <span className="project-name">{displayName}</span>
                <ChevronDown />
            </button>

            {isOpen && (
                <div className="project-switcher-dropdown">
                    {loading ? (
                        <div style={{ padding: '0.75rem' }}>
                            <Skeleton variant="card" count={3} />
                        </div>
                    ) : projects.length === 0 ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', opacity: 0.5, fontSize: '0.82rem' }}>
                            No projects yet.
                        </div>
                    ) : (
                        projects.map(p => (
                            <div
                                key={p.id}
                                className={`dropdown-item ${p.id === currentProjectId ? 'active' : ''}`}
                                onClick={() => handleSelect(p.id)}
                            >
                                <span className="dropdown-item-title">{p.idea}</span>
                                <span className="dropdown-item-date">
                                    {new Date(p.createdAt).toLocaleDateString()}
                                </span>
                                <button
                                    className="dropdown-item-delete"
                                    onClick={(e) => handleDeleteTrigger(e, p)}
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        ))
                    )}
                    <div className="project-switcher-new" onClick={onNewProject}>
                        <PlusIcon />
                        New Project
                    </div>
                </div>
            )}

            {projectToConfirm && (
                <DeleteProjectModal
                    projectTitle={projectToConfirm.idea}
                    onArchive={handleArchive}
                    onDelete={handleDeletePermanent}
                    onClose={() => setProjectToConfirm(null)}
                />
            )}
        </div>
    );
}
