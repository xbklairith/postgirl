import { useState } from "react";
import { Button, Input, Modal } from "./components/ui";
import { WorkspaceDashboard } from "./components/workspace";
import { HttpRequestForm } from "./components/http";
import { EnvironmentManagement } from "./components/environment/EnvironmentManagement";
import { CollectionBrowser } from "./components/collection";
import { useWorkspaceInitialization, useWorkspaceStore } from "./stores/workspace-store";
import { useTheme } from "./hooks/use-theme";

function App() {
  const [currentView, setCurrentView] = useState<'workspaces' | 'api-testing' | 'environments'>('api-testing');
  const { currentTheme, toggleTheme } = useTheme();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestCollectionId, setRequestCollectionId] = useState<string | null>(null);
  const [requestName, setRequestName] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Initialize workspace database and get active workspace
  useWorkspaceInitialization();
  const { activeWorkspace } = useWorkspaceStore();


  const handleCreateRequest = async () => {
    if (!requestCollectionId || !requestName.trim()) {
      return;
    }

    try {
      console.log('Creating request with name:', requestName.trim());
      const { CollectionApiService } = await import('./services/collection-api');
      const { createDefaultRequest } = await import('./types/collection');
      
      const requestData = createDefaultRequest(requestCollectionId);
      requestData.name = requestName.trim();
      
      console.log('Calling CollectionApiService.createRequest with:', requestData);
      const newRequest = await CollectionApiService.createRequest(requestData);
      console.log('Created new request:', newRequest);
      
      // Close modal and reset state
      setShowRequestModal(false);
      setRequestCollectionId(null);
      setRequestName('');
      
      // Trigger collection refresh to show the new request
      setRefreshTrigger(prev => prev + 1);
      
      // Switch to API testing view to edit the new request
      setCurrentView('api-testing');
    } catch (error) {
      console.error('Failed to create request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to create request: ${errorMessage}`);
    }
  };

  return (
    <div className="min-h-screen py-4 px-2">
      {/* Header */}
      <div className="header">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500"></div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Postgirl
            </h1>
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Git-based API Testing Platform
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            variant={currentView === 'workspaces' ? 'primary' : 'ghost'} 
            onClick={() => setCurrentView('workspaces')}
          >
            Workspaces
          </Button>
          <Button 
            variant={currentView === 'api-testing' ? 'primary' : 'ghost'} 
            onClick={() => setCurrentView('api-testing')}
          >
            API Testing
          </Button>
          <Button 
            variant={currentView === 'environments' ? 'primary' : 'ghost'} 
            onClick={() => setCurrentView('environments')}
          >
            Environments
          </Button>
          <Button variant="ghost" onClick={toggleTheme}>
            {currentTheme === 'dark' ? '🌙' : '☀️'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full space-y-6">
        {currentView === 'workspaces' && (
          <WorkspaceDashboard 
            onWorkspaceSelect={() => {
              // Navigate to selected workspace
            }}
          />
        )}

        {currentView === 'api-testing' && (
          <div id="api-testing-view" className="h-[calc(100vh-120px)]" data-testid="api-testing-container">
            {activeWorkspace ? (
              <div id="api-testing-main" className="flex h-full bg-white dark:bg-slate-900" data-layout="two-column">
                {/* Collections Sidebar */}
                <div id="collections-sidebar" className="w-80 border-r border-slate-200/60 dark:border-slate-600/60 bg-slate-50/30 dark:bg-slate-800/30" data-testid="collections-sidebar">
                  <CollectionBrowser 
                    workspaceId={activeWorkspace.id}
                    selectedCollectionId={selectedCollectionId}
                    selectedRequest={selectedRequest}
                    onCollectionSelect={(collectionId) => {
                      setSelectedCollectionId(collectionId);
                      setSelectedRequest(null); // Clear selected request when changing collections
                    }}
                    onRequestSelect={(request) => {
                      console.log('App.tsx: Request selected:', request);
                      setSelectedRequest(request);
                      // Don't clear collection selection - keep it for context
                    }}
                    onRequestEdit={(request) => {
                      setSelectedRequest(request);
                    }}
                    onRequestCreate={(collectionId) => {
                      console.log('App.tsx onRequestCreate called with collectionId:', collectionId);
                      setRequestCollectionId(collectionId);
                      setRequestName('New Request');
                      setShowRequestModal(true);
                    }}
                    refreshTrigger={refreshTrigger}
                    className="h-full"
                  />
                </div>
                
                {/* Request Crafting Main Area */}
                <div id="request-crafting-area" className="flex-1 flex flex-col bg-white dark:bg-slate-900" data-testid="main-content-area">
                  {selectedRequest ? (
                    // HTTP Request Form for editing/testing a specific request
                    <div id="request-editor" className="flex-1 p-6 overflow-auto" data-testid="request-editor" data-request-id={selectedRequest.id}>
                      <HttpRequestForm 
                        initialRequest={selectedRequest}
                        onResponse={() => {
                          // Handle response
                        }}
                        onError={() => {
                          // Handle error  
                        }}
                      />
                    </div>
                  ) : selectedCollectionId ? (
                    // Collection selected - show requests area
                    <div id="collection-requests" data-testid="collection-requests" data-collection-id={selectedCollectionId}>
                      <div className="p-6 border-b border-slate-200/60 dark:border-slate-600/60 bg-white dark:bg-slate-900">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                          Collection Selected
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                          RequestList component removed as requested
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Empty state - no collection selected
                    <div id="empty-state" className="flex-1 flex items-center justify-center p-8" data-testid="select-collection-state">
                      <div className="text-center text-slate-500 dark:text-slate-400 max-w-md">
                        <div className="mb-6">
                          <svg className="w-20 h-20 mx-auto opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V5a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 00-2 2z" />
                          </svg>
                        </div>
                        <h3 id="empty-state-title" className="text-xl font-semibold mb-3 text-slate-700 dark:text-slate-300">Select a Collection</h3>
                        <p id="empty-state-description" className="text-sm leading-relaxed">Choose a collection from the sidebar to view its requests and start testing your APIs</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-500 dark:text-slate-400">
                  <div className="mb-4">
                    <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Active Workspace</h3>
                  <p className="text-sm mb-4">Select or create a workspace to start API testing</p>
                  <Button
                    variant="primary"
                    onClick={() => setCurrentView('workspaces')}
                  >
                    Go to Workspaces
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'environments' && (
          <div className="h-[calc(100vh-200px)] p-6">
            {activeWorkspace ? (
              <EnvironmentManagement 
                workspaceId={activeWorkspace.id}
                onEnvironmentChange={(environmentId) => {
                  console.log('Environment changed:', environmentId);
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-500 dark:text-slate-400">
                  <div className="mb-4">
                    <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Active Workspace</h3>
                  <p className="text-sm mb-4">Select or create a workspace to manage environments</p>
                  <Button
                    variant="primary"
                    onClick={() => setCurrentView('workspaces')}
                  >
                    Go to Workspaces
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}


      </div>


      {/* Request Creation Modal */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          setRequestCollectionId(null);
          setRequestName('');
        }}
        title="Create New Request"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="requestName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Request Name
            </label>
            <Input
              id="requestName"
              type="text"
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              placeholder="Enter request name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && requestName.trim()) {
                  handleCreateRequest();
                } else if (e.key === 'Escape') {
                  setShowRequestModal(false);
                  setRequestCollectionId(null);
                  setRequestName('');
                }
              }}
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowRequestModal(false);
                setRequestCollectionId(null);
                setRequestName('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateRequest}
              disabled={!requestName.trim()}
            >
              Create Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default App;