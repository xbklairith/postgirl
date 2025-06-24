import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Input, Card, CardHeader, CardBody, Modal } from "./components/ui";
import { WorkspaceDashboard } from "./components/workspace";
import { useWorkspaceInitialization } from "./stores/workspace-store";
import { useTheme } from "./hooks/use-theme";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [healthStatus, setHealthStatus] = useState("");
  const [currentView, setCurrentView] = useState<'demo' | 'workspaces'>('workspaces');
  const { currentTheme, toggleTheme } = useTheme();
  
  // Initialize workspace database
  useWorkspaceInitialization();

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  async function checkHealth() {
    try {
      const status = await invoke("health_check");
      setHealthStatus(status as string);
    } catch (error) {
      setHealthStatus("Health check failed: " + error);
    }
  }

  return (
    <div className="min-h-screen p-6">
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
            variant={currentView === 'demo' ? 'primary' : 'ghost'} 
            onClick={() => setCurrentView('demo')}
          >
            Demo
          </Button>
          <Button variant="ghost" onClick={toggleTheme}>
            {currentTheme === 'dark' ? '🌙' : '☀️'}
          </Button>
          <Button variant="secondary" onClick={checkHealth}>
            Health Check
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto space-y-6">
        {currentView === 'workspaces' && (
          <WorkspaceDashboard 
            onWorkspaceSelect={() => {
              // Navigate to selected workspace
            }}
          />
        )}

        {currentView === 'demo' && (
          <>
            {/* Welcome Card */}
            <Card className="text-center">
              <CardHeader>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Welcome to Postgirl! 🚀
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  Modern, Git-based API testing desktop application built with Tauri + React
                </p>
              </CardHeader>
              <CardBody>
                <div className="flex justify-center space-x-8 mb-6">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <span className="text-white font-bold">V</span>
                    </div>
                    <span className="text-xs text-slate-500">Vite</span>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                      <span className="text-white font-bold">T</span>
                    </div>
                    <span className="text-xs text-slate-500">Tauri</span>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                      <span className="text-white font-bold">R</span>
                    </div>
                    <span className="text-xs text-slate-500">React</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Interactive Demo */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Try the Greeting Feature
                  </h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    <Input
                      label="Your Name"
                      placeholder="Enter your name..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <div className="flex space-x-2">
                      <Button variant="primary" onClick={greet} className="flex-1">
                        Greet Me!
                      </Button>
                      <Button variant="secondary" onClick={() => setShowModal(true)}>
                        Info
                      </Button>
                    </div>
                    {greetMsg && (
                      <div className="glass-card mt-4 text-center">
                        <p className="text-slate-700 dark:text-slate-200">{greetMsg}</p>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    System Status
                  </h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Frontend</span>
                      <span className="text-success-500 font-medium">✓ Running</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Tauri Backend</span>
                      <span className="text-success-500 font-medium">✓ Connected</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Theme</span>
                      <span className="text-primary-500 font-medium capitalize">{currentTheme}</span>
                    </div>
                    {healthStatus && (
                      <div className="glass-card mt-4">
                        <p className="text-sm text-slate-700 dark:text-slate-200">{healthStatus}</p>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Feature Preview */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Coming Soon: Full API Testing Suite
                </h3>
              </CardHeader>
              <CardBody>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20">
                    <div className="text-2xl mb-2">🔄</div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">Git Integration</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Version control for API collections</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/20 dark:to-success-800/20">
                    <div className="text-2xl mb-2">🌍</div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">Environment Management</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Consistent variable schemas</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-900/20 dark:to-warning-800/20">
                    <div className="text-2xl mb-2">⚡</div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">Performance</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Rust-powered HTTP engine</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </>
        )}
      </div>

      {/* Info Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="About This Demo"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            This is a demonstration of the Postgirl glassmorphism design system built with:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
            <li>React 18 + TypeScript</li>
            <li>Tailwind CSS with custom design tokens</li>
            <li>Tauri 2.0 for native performance</li>
            <li>Dark/Light theme support</li>
            <li>Glassmorphism UI components</li>
          </ul>
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setShowModal(false)}>
              Got it!
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default App;