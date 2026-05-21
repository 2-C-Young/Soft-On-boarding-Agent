import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { userApi, type UserProfileResponse } from '../services/userApi';
import { spaceApi } from '../services/spaceApi';
import { Copy, Check, Link as LinkIcon, User, Mail, Briefcase, AlertTriangle } from 'lucide-react';

export function SettingsView() {
  const navigate = useNavigate();
  const setTeamCode = useAuthStore((state) => state.setTeamCode);
  const setSpaceId = useAuthStore((state) => state.setSpaceId);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await userApi.getProfile();
        setProfile(data);
      } catch (error) {
        console.error('Failed to load profile', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleCopyCode = () => {
    if (profile?.teamInfo?.teamCode) {
      navigator.clipboard.writeText(profile.teamInfo.teamCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeaveTeam = async () => {
    setIsLeaving(true);
    try {
      await spaceApi.leaveSpace();
      setTeamCode(null);
      setSpaceId(null); // 탈퇴 시 spaceId 초기화
      navigate('/');
    } catch (error) {
      console.error('Failed to leave team', error);
      alert('팀 탈퇴에 실패했습니다.');
      setIsLeaving(false);
      setIsModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <p>프로필 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings & Profile</h2>
        <p className="mt-1 text-sm text-gray-500">Manage your account and team workspace settings.</p>
      </div>

      {/* Profile Section */}
      <div className="bg-white shadow sm:rounded-lg overflow-hidden border border-gray-200">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900">User Profile</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center gap-2"><User size={16}/> Name</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{profile.userName}</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center gap-2"><Mail size={16}/> Email</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{profile.userEmail || 'N/A'}</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center gap-2"><Briefcase size={16}/> Role</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {profile.role}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Team Info Section */}
      <div className="bg-white shadow sm:rounded-lg overflow-hidden border border-gray-200">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Workspace</h3>
        </div>
        <div className="border-t border-gray-200">
          {profile.teamInfo ? (
            <div className="px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Team Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-semibold">{profile.teamInfo.teamName}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Team Code</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center gap-3">
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">{profile.teamInfo.teamCode}</span>
                    <button 
                      onClick={handleCopyCode}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Copy code"
                    >
                      {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center gap-2"><LinkIcon size={16}/> Repository</dt>
                  <dd className="mt-1 text-sm text-blue-600 sm:mt-0 sm:col-span-2">
                    <a href={profile.teamInfo.repoUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {profile.teamInfo.repoUrl}
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="px-4 py-8 text-center sm:px-6">
              <p className="text-sm text-gray-500 mb-4">현재 참여 중인 팀 스페이스가 없습니다.</p>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                스페이스 생성 또는 참여하기
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      {profile.teamInfo && (
        <div className="bg-red-50 shadow sm:rounded-lg overflow-hidden border border-red-200">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-red-800">Danger Zone</h3>
            <div className="mt-2 max-w-xl text-sm text-red-700">
              <p>
                팀에서 탈퇴하면 해당 팀의 리소스에 더 이상 접근할 수 없습니다. 관리자인 경우 다른 멤버에게 권한이 위임되거나 팀이 해체될 수 있습니다.
              </p>
            </div>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm transition-colors"
              >
                팀 탈퇴하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => !isLeaving && setIsModalOpen(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="relative z-50 inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    정말 팀에서 탈퇴하시겠습니까?
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      탈퇴 후에는 현재 팀 스페이스에 대한 모든 접근 권한을 잃게 됩니다. 이 작업은 되돌릴 수 없습니다.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={isLeaving}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors ${isLeaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                  onClick={handleLeaveTeam}
                >
                  {isLeaving ? '탈퇴 중...' : '탈퇴하기'}
                </button>
                <button
                  type="button"
                  disabled={isLeaving}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
                  onClick={() => setIsModalOpen(false)}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
