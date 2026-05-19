import React, { useState } from 'react';
import {
    CheckCircle2,
    Circle,
    Clock,
    GitBranch,
    LayoutGrid,
    Filter
} from 'lucide-react';

// --- Types ---
type ReleaseType = 'release' | 'hotfix';
type IssueStatus = 'Todo' | 'In Progress' | 'Done';
type RoleType = 'Frontend' | 'Backend' | 'DevOps' | 'Design';

interface Release {
    id: number;
    name: string;
    date: string;
    type: ReleaseType;
    completedTasks: number;
    totalTasks: number;
}

interface Issue {
    id: string;
    releaseId: number;
    title: string;
    status: IssueStatus;
    role: RoleType;
    assignee: string;
    avatarUrl: string;
}

// --- Dummy Data ---
const dummyReleases: Release[] = [
    { id: 1, name: 'v1.0.0 (MVP)', date: 'May 10', type: 'release', completedTasks: 15, totalTasks: 15 },
    { id: 2, name: 'Hotfix-Auth', date: 'May 12', type: 'hotfix', completedTasks: 2, totalTasks: 2 },
    { id: 3, name: 'v1.1.0 (Beta)', date: 'May 15', type: 'release', completedTasks: 8, totalTasks: 12 },
    { id: 4, name: 'v1.2.0 (RC)', date: 'May 20', type: 'release', completedTasks: 1, totalTasks: 20 },
];

const dummyIssues: Issue[] = [
    { id: 'SYS-101', releaseId: 3, title: 'Process Flow View 칸반 보드 레이아웃 구현', status: 'Done', role: 'Frontend', assignee: 'Minjun', avatarUrl: 'https://i.pravatar.cc/150?u=minjun' },
    { id: 'SYS-102', releaseId: 3, title: '릴리즈 히스토리 조회 API 연동', status: 'In Progress', role: 'Backend', assignee: 'Alex', avatarUrl: 'https://i.pravatar.cc/150?u=alex' },
    { id: 'SYS-103', releaseId: 3, title: '이슈 카드 드래그 앤 드롭 애니메이션', status: 'Todo', role: 'Frontend', assignee: 'Minjun', avatarUrl: 'https://i.pravatar.cc/150?u=minjun' },
    { id: 'SYS-104', releaseId: 3, title: 'DB 스키마 마이그레이션 스크립트 작성', status: 'Done', role: 'Backend', assignee: 'Alex', avatarUrl: 'https://i.pravatar.cc/150?u=alex' },
    { id: 'SYS-105', releaseId: 3, title: '온보딩 대시보드 공통 컴포넌트 디자인', status: 'Done', role: 'Design', assignee: 'Sam', avatarUrl: 'https://i.pravatar.cc/150?u=sam' },
    { id: 'SYS-106', releaseId: 3, title: '스테이징 서버 CI/CD 파이프라인 수정', status: 'In Progress', role: 'DevOps', assignee: 'Chris', avatarUrl: 'https://i.pravatar.cc/150?u=chris' },
];

const ROLES: ('All' | RoleType)[] = ['All', 'Frontend', 'Backend', 'DevOps', 'Design'];

// --- Helper Functions ---
const getRoleBadgeStyle = (role: RoleType) => {
    switch (role) {
        case 'Frontend': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'Backend': return 'bg-orange-50 text-orange-700 border-orange-200';
        case 'DevOps': return 'bg-purple-50 text-purple-700 border-purple-200';
        case 'Design': return 'bg-pink-50 text-pink-700 border-pink-200';
    }
};

const getStatusIcon = (status: IssueStatus) => {
    switch (status) {
        case 'Todo': return <Circle className="w-4 h-4 text-gray-400" />;
        case 'In Progress': return <Clock className="w-4 h-4 text-amber-500" />;
        case 'Done': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
};

export function ProcessFlowView() {
    const [selectedReleaseId, setSelectedReleaseId] = useState<number>(dummyReleases[2].id);
    const [selectedRole, setSelectedRole] = useState<'All' | RoleType>('All');

    // Filter logic
    const filteredIssues = dummyIssues.filter(issue =>
        issue.releaseId === selectedReleaseId &&
        (selectedRole === 'All' || issue.role === selectedRole)
    );

    // Group by status for Kanban
    const issuesByStatus = {
        'Todo': filteredIssues.filter(i => i.status === 'Todo'),
        'In Progress': filteredIssues.filter(i => i.status === 'In Progress'),
        'Done': filteredIssues.filter(i => i.status === 'Done'),
    };

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA]">

            {/* --- Top: Release Timeline --- */}
            <div className="bg-white border-b border-gray-200 p-8 flex-shrink-0">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <GitBranch className="w-6 h-6" /> Release Timeline
                </h2>

                <div className="flex items-start overflow-x-auto pb-4 hide-scrollbar">
                    {dummyReleases.map((release, index) => {
                        const isSelected = selectedReleaseId === release.id;
                        const progressPct = Math.round((release.completedTasks / release.totalTasks) * 100) || 0;

                        return (
                            <React.Fragment key={release.id}>
                                <div
                                    className={`flex flex-col items-center cursor-pointer transition-all ${isSelected ? 'opacity-100 scale-105' : 'opacity-60 hover:opacity-100'}`}
                                    onClick={() => setSelectedReleaseId(release.id)}
                                >
                                    {/* Node */}
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 mb-3 shadow-sm
                    ${release.type === 'hotfix'
                                            ? (isSelected ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white')
                                            : (isSelected ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white')
                                        }`}
                                    >
                                        <span className="font-mono text-sm font-bold">{release.type === 'hotfix' ? 'H' : 'R'}</span>
                                    </div>

                                    {/* Info & Progress */}
                                    <div className="text-center w-28">
                                        <p className={`text-sm font-bold truncate ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>{release.name}</p>
                                        <p className="text-xs text-gray-400 mb-2">{release.date}</p>

                                        {/* Progress Bar */}
                                        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1 overflow-hidden">
                                            <div
                                                className={`h-1.5 rounded-full ${release.type === 'hotfix' ? 'bg-purple-500' : 'bg-blue-500'}`}
                                                style={{ width: `${progressPct}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-[10px] font-medium text-gray-500">{release.completedTasks}/{release.totalTasks} Done</p>
                                    </div>
                                </div>

                                {/* Connector Line */}
                                {index < dummyReleases.length - 1 && (
                                    <div className="w-16 h-px bg-gray-300 border-t-2 border-dashed border-gray-300 mt-6 mx-2"></div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* --- Bottom: Kanban Board Area --- */}
            <div className="flex-1 overflow-hidden flex flex-col p-8">

                {/* Header & Role Filters */}
                <div className="flex justify-between items-end mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <LayoutGrid className="w-6 h-6 text-gray-400" /> Associated Issues
                    </h2>

                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                        <Filter className="w-4 h-4 text-gray-400 ml-2" />
                        <div className="h-4 w-px bg-gray-200 mx-1"></div>
                        {ROLES.map(role => (
                            <button
                                key={role}
                                onClick={() => setSelectedRole(role)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${selectedRole === role
                                    ? 'bg-gray-900 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                {role}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Kanban Columns */}
                <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
                    {(['Todo', 'In Progress', 'Done'] as IssueStatus[]).map(status => (
                        <div key={status} className="flex-1 min-w-[300px] flex flex-col bg-gray-100/50 rounded-xl p-4 border border-gray-200/60">

                            {/* Column Header */}
                            <div className="flex items-center justify-between mb-4 px-2">
                                <div className="flex items-center gap-2 font-semibold text-gray-700 text-sm">
                                    {getStatusIcon(status)} {status}
                                </div>
                                <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {issuesByStatus[status].length}
                                </span>
                            </div>

                            {/* Cards Container */}
                            <div className="flex flex-col gap-3 overflow-y-auto">
                                {issuesByStatus[status].map(issue => (
                                    <div key={issue.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow hover:border-gray-300 cursor-pointer group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[11px] font-mono font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                {issue.id}
                                            </span>
                                            {/* Role Badge */}
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getRoleBadgeStyle(issue.role)}`}>
                                                {issue.role}
                                            </span>
                                        </div>

                                        <h3 className="text-sm font-semibold text-gray-900 leading-snug mb-4 group-hover:text-blue-600 transition-colors">
                                            {issue.title}
                                        </h3>

                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="flex items-center gap-2">
                                                <img src={issue.avatarUrl} alt="avatar" className="w-6 h-6 rounded-full border-2 border-white shadow-sm" />
                                                <span className="text-xs font-medium text-gray-600">{issue.assignee}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {issuesByStatus[status].length === 0 && (
                                    <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-xl mt-2 text-gray-400 text-sm">
                                        No issues found.
                                    </div>
                                )}
                            </div>

                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}