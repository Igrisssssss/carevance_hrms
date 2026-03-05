import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User, Bell, Lock, CreditCard, Building } from 'lucide-react';

export default function SettingsPage() {
  const { user, organization } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const isEmployee = user?.role === 'employee';

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'organization', name: 'Organization', icon: Building },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Lock },
    { id: 'billing', name: 'Billing', icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account settings</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64 shrink-0">
          <nav className="bg-white rounded-xl border border-gray-200 p-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${activeTab === tab.id ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Profile Settings</h2>
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-2xl font-bold">
                  {user?.name?.charAt(0)}
                </div>
                <div>
                  <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">Change Photo</button>
                  <p className="text-sm text-gray-500 mt-2">JPG, PNG. Max 2MB</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    defaultValue={user?.name}
                    disabled={isEmployee}
                    className={`w-full border border-gray-300 rounded-lg px-3 py-2 ${isEmployee ? 'bg-gray-50 text-gray-500' : ''}`}
                  />
                  {isEmployee && <p className="text-xs text-gray-500 mt-1">Only admin/manager can update employee name.</p>}
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" defaultValue={user?.email} className="w-full border border-gray-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Role</label><input type="text" defaultValue={user?.role} disabled className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" /></div>
              </div>
              {!isEmployee && (
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">Save Changes</button>
              )}
            </div>
          )}

          {activeTab === 'organization' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Organization Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label><input type="text" defaultValue={organization?.name} className="w-full border border-gray-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Slug</label><input type="text" defaultValue={organization?.slug} className="w-full border border-gray-300 rounded-lg px-3 py-2" /></div>
              </div>
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">Save Changes</button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
              {['Email notifications', 'Weekly summary', 'Project updates', 'Task assignments'].map(item => (
                <div key={item} className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-700">{item}</span>
                  <input type="checkbox" defaultChecked className="h-5 w-5 text-primary-600 rounded" />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label><input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">New Password</label><input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label><input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2" /></div>
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">Update Password</button>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Billing & Subscription</h2>
              <div className="bg-primary-50 rounded-xl p-4">
                <p className="text-sm text-primary-600">Current Plan: <span className="font-semibold">Pro</span></p>
                <p className="text-xs text-primary-500 mt-1">Your subscription renews on Jan 1, 2025</p>
              </div>
              <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">Manage Subscription</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
