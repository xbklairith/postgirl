import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  GitBranch, 
  Users, 
  Plus, 
  FolderOpen, 
  Send, 
  Save, 
  RefreshCw,
  ChevronDown,
  Globe,
  Lock,
  Eye,
  Code,
  Play,
  Copy,
  Download,
  Upload,
  Terminal,
  Book,
  Zap,
  Activity,
  Database,
  Clock,
  User,
  Hash,
  CheckCircle,
  AlertCircle,
  GitCommit,
  GitPullRequest,
  RefreshCcw
} from 'lucide-react';

const Postgirl = () => {
  const [activeWorkspace, setActiveWorkspace] = useState('Mobile App APIs');
  const [activeTab, setActiveTab] = useState('request-1');
  const [currentBranch, setCurrentBranch] = useState('main');
  const [syncStatus, setSyncStatus] = useState('synced'); // synced, ahead, behind, conflict
  const [selectedMethod, setSelectedMethod] = useState('GET');
  const [requestUrl, setRequestUrl] = useState('https://api.example.com/users');
  const [selectedEnvironment, setSelectedEnvironment] = useState('Development');
  const [responseData, setResponseData] = useState('');
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [activeView, setActiveView] = useState('collections'); // collections, history, tests

  const workspaces = [
    { 
      name: 'Mobile App APIs', 
      repo: 'github.com/team/mobile-apis',
      branch: 'main',
      status: 'synced',
      teamMembers: 4,
      lastSync: '2 minutes ago'
    },
    { 
      name: 'Backend Services', 
      repo: 'github.com/team/backend-apis',
      branch: 'develop',
      status: 'ahead',
      teamMembers: 6,
      lastSync: '5 minutes ago'
    },
    { 
      name: 'Third Party APIs', 
      repo: 'github.com/team/external-apis',
      branch: 'main',
      status: 'behind',
      teamMembers: 2,
      lastSync: '1 hour ago'
    }
  ];

  const environments = ['Development', 'Staging', 'Production'];
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  const collections = [
    {
      name: 'User Management',
      requests: [
        { name: 'Get Users', method: 'GET', url: '/users' },
        { name: 'Create User', method: 'POST', url: '/users' },
        { name: 'Update User', method: 'PUT', url: '/users/:id' }
      ]
    },
    {
      name: 'Authentication',
      requests: [
        { name: 'Login', method: 'POST', url: '/auth/login' },
        { name: 'Refresh Token', method: 'POST', url: '/auth/refresh' },
        { name: 'Logout', method: 'POST', url: '/auth/logout' }
      ]
    }
  ];

  const teamMembers = [
    { name: 'Alice Johnson', avatar: '👩‍💻', status: 'online', currentFile: 'auth.json' },
    { name: 'Bob Smith', avatar: '👨‍💼', status: 'online', currentFile: 'users.json' },
    { name: 'Carol Davis', avatar: '👩‍🔬', status: 'away', currentFile: null },
    { name: 'David Wilson', avatar: '👨‍🎨', status: 'offline', currentFile: null }
  ];

  const getSyncStatusColor = (status) => {
    switch (status) {
      case 'synced': return 'text-green-500';
      case 'ahead': return 'text-blue-500';
      case 'behind': return 'text-orange-500';
      case 'conflict': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getSyncStatusIcon = (status) => {
    switch (status) {
      case 'synced': return <CheckCircle className="w-4 h-4" />;
      case 'ahead': return <Upload className="w-4 h-4" />;
      case 'behind': return <Download className="w-4 h-4" />;
      case 'conflict': return <AlertCircle className="w-4 h-4" />;
      default: return <RefreshCcw className="w-4 h-4" />;
    }
  };

  const sendRequest = () => {
    // Simulate API request
    setSyncStatus('ahead'); // Mark as ahead after making changes
    setResponseData(JSON.stringify({
      "status": "success",
      "data": {
        "users": [
          {
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com",
            "created_at": "2025-06-24T10:30:00Z"
          },
          {
            "id": 2,
            "name": "Jane Smith",
            "email": "jane@example.com",
            "created_at": "2025-06-23T14:15:00Z"
          }
        ]
      },
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 2
      }
    }, null, 2));
  };

  return (
    <div className="h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white overflow-hidden">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Postgirl
            </h1>
            
            {/* Workspace Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowWorkspaceSwitcher(!showWorkspaceSwitcher)}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-all duration-200"
              >
                <FolderOpen className="w-4 h-4" />
                <span className="font-medium">{activeWorkspace}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showWorkspaceSwitcher && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-black/80 backdrop-blur-xl rounded-xl border border-white/20 p-2 z-50">
                  {workspaces.map((workspace, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setActiveWorkspace(workspace.name);
                        setCurrentBranch(workspace.branch);
                        setSyncStatus(workspace.status);
                        setShowWorkspaceSwitcher(false);
                      }}
                      className="p-3 rounded-lg hover:bg-white/10 cursor-pointer transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{workspace.name}</div>
                          <div className="text-sm text-gray-400">{workspace.repo}</div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <GitBranch className="w-3 h-3" />
                            <span className="text-xs">{workspace.branch}</span>
                          </div>
                          <div className="flex items-center space-x-1 mt-1">
                            <Users className="w-3 h-3" />
                            <span className="text-xs">{workspace.teamMembers}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-white/10 mt-2 pt-2">
                    <button className="w-full flex items-center space-x-2 p-3 rounded-lg hover:bg-white/10 transition-all duration-200 text-purple-400">
                      <Plus className="w-4 h-4" />
                      <span>Add Workspace</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Git Status */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-lg">
                <GitBranch className="w-4 h-4" />
                <span className="text-sm">{currentBranch}</span>
              </div>
              <div className={`flex items-center space-x-1 ${getSyncStatusColor(syncStatus)}`}>
                {getSyncStatusIcon(syncStatus)}
                <span className="text-xs capitalize">{syncStatus}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Team Members */}
            <div className="flex -space-x-2">
              {teamMembers.slice(0, 3).map((member, index) => (
                <div
                  key={index}
                  className={`w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center text-sm ${
                    member.status === 'online' ? 'bg-green-500' : 
                    member.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`}
                  title={`${member.name} - ${member.status}${member.currentFile ? ` (editing ${member.currentFile})` : ''}`}
                >
                  {member.avatar}
                </div>
              ))}
              {teamMembers.length > 3 && (
                <div className="w-8 h-8 rounded-full border-2 border-white/20 bg-white/10 flex items-center justify-center text-xs">
                  +{teamMembers.length - 3}
                </div>
              )}
            </div>

            <button className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-80 bg-black/20 backdrop-blur-xl border-r border-white/10 p-4">
          {/* View Tabs */}
          <div className="flex space-x-1 mb-4 bg-white/5 p-1 rounded-lg">
            {[
              { id: 'collections', label: 'Collections', icon: Book },
              { id: 'history', label: 'History', icon: Clock },
              { id: 'tests', label: 'Tests', icon: Zap }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveView(id)}
                className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
                  activeView === id ? 'bg-purple-500 text-white' : 'hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>

          {/* Collections View */}
          {activeView === 'collections' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Collections</h3>
                <button className="p-1 hover:bg-white/10 rounded">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {collections.map((collection, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm font-medium text-purple-300">
                    <FolderOpen className="w-4 h-4" />
                    <span>{collection.name}</span>
                  </div>
                  {collection.requests.map((request, reqIndex) => (
                    <div
                      key={reqIndex}
                      className="ml-6 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-all duration-200 group"
                    >
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded font-mono ${
                          request.method === 'GET' ? 'bg-green-500/20 text-green-300' :
                          request.method === 'POST' ? 'bg-blue-500/20 text-blue-300' :
                          request.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {request.method}
                        </span>
                        <span className="text-sm group-hover:text-white transition-colors">
                          {request.name}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 ml-12">
                        {request.url}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* History View */}
          {activeView === 'history' && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Request History</h3>
              {[
                { method: 'GET', url: '/api/users', time: '2 minutes ago', status: 200 },
                { method: 'POST', url: '/api/auth/login', time: '5 minutes ago', status: 201 },
                { method: 'GET', url: '/api/posts', time: '10 minutes ago', status: 404 },
              ].map((item, index) => (
                <div key={index} className="p-3 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded font-mono ${
                        item.method === 'GET' ? 'bg-green-500/20 text-green-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {item.method}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        item.status < 300 ? 'bg-green-500/20 text-green-300' :
                        item.status < 400 ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{item.time}</span>
                  </div>
                  <div className="text-sm mt-1 text-gray-300">{item.url}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tests View */}
          {activeView === 'tests' && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Test Suites</h3>
              {[
                { name: 'User API Tests', passed: 8, failed: 1, total: 9 },
                { name: 'Auth Flow Tests', passed: 5, failed: 0, total: 5 },
                { name: 'Integration Tests', passed: 12, failed: 2, total: 14 },
              ].map((suite, index) => (
                <div key={index} className="p-3 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{suite.name}</span>
                    <Play className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="flex items-center space-x-4 mt-2 text-sm">
                    <span className="text-green-400">{suite.passed} passed</span>
                    <span className="text-red-400">{suite.failed} failed</span>
                    <span className="text-gray-400">{suite.total} total</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Tabs */}
          <div className="bg-black/10 border-b border-white/10 p-2">
            <div className="flex space-x-1">
              <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-lg">
                <Globe className="w-4 h-4" />
                <span className="text-sm">New Request</span>
                <button className="text-gray-400 hover:text-white">×</button>
              </div>
              <button className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Request Builder */}
          <div className="p-6 space-y-6">
            {/* URL Bar */}
            <div className="flex space-x-3">
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {methods.map((method) => (
                  <option key={method} value={method} className="bg-gray-800">
                    {method}
                  </option>
                ))}
              </select>
              
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={requestUrl}
                  onChange={(e) => setRequestUrl(e.target.value)}
                  placeholder="Enter request URL"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={selectedEnvironment}
                onChange={(e) => setSelectedEnvironment(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {environments.map((env) => (
                  <option key={env} value={env} className="bg-gray-800">
                    {env}
                  </option>
                ))}
              </select>
              
              <button
                onClick={sendRequest}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>

            {/* Request/Response Panels */}
            <div className="grid grid-cols-2 gap-6 h-96">
              {/* Request Panel */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Request</h3>
                  <div className="flex space-x-2">
                    <button className="p-1 hover:bg-white/10 rounded">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button className="p-1 hover:bg-white/10 rounded">
                      <Code className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex space-x-4 mb-2">
                      <button className="text-sm text-purple-400 border-b border-purple-400 pb-1">Headers</button>
                      <button className="text-sm text-gray-400 hover:text-white">Body</button>
                      <button className="text-sm text-gray-400 hover:text-white">Auth</button>
                      <button className="text-sm text-gray-400 hover:text-white">Params</button>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Header name"
                          className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Header value"
                          className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Response Panel */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Response</h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-sm">
                      <Activity className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">200 OK</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-400">234ms</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-400">1.2KB</span>
                    </div>
                  </div>
                </div>
                
                <div className="h-64 bg-black/20 rounded-lg p-3 overflow-auto">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                    {responseData || 'Click "Send" to see response...'}
                  </pre>
                </div>
              </div>
            </div>

            {/* Git Status Bar */}
            <div className="bg-black/20 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <GitCommit className="w-4 h-4" />
                    <span className="text-sm">Last commit: Update user endpoints</span>
                    <span className="text-xs text-gray-400">by Alice Johnson • 15 minutes ago</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {syncStatus === 'ahead' && (
                    <span className="text-xs text-blue-400 flex items-center space-x-1">
                      <Upload className="w-3 h-3" />
                      <span>1 commit ahead</span>
                    </span>
                  )}
                  <button className="flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 px-3 py-1 rounded text-sm transition-all duration-200">
                    <GitCommit className="w-3 h-3" />
                    <span>Commit Changes</span>
                  </button>
                  <button className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-sm transition-all duration-200">
                    <GitPullRequest className="w-3 h-3" />
                    <span>Create PR</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Postgirl;