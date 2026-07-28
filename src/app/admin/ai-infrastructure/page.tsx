"use client";

import { useEffect, useState } from "react";

export default function AdminAiInfrastructurePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectId, setNewProjectId] = useState("");

  const [isAddCredentialOpen, setIsAddCredentialOpen] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-infrastructure");
      if (!res.ok) {
        throw new Error("Failed to fetch infrastructure data");
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Unknown error");
      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProject = async () => {
    if (!newProjectName || !newProjectId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: newProjectName, external_project_id: newProjectId })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setIsCreateProjectOpen(false);
      setNewProjectName("");
      setNewProjectId("");
      await fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProjectAction = async (id: string, action: "ENABLE" | "DISABLE") => {
    if (action === "DISABLE") {
      const isZeroRoutes = data.routes - data.credentials.filter((c: any) => c.project_id === id && c.status === "AVAILABLE").length === 0;
      if (isZeroRoutes && !confirm("THIS ACTION WILL LEAVE KAIRO WITHOUT AI CAPACITY. Are you sure?")) return;
    }

    try {
      const res = await fetch(`/api/admin/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleRefreshModels = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/projects/${id}/refresh`, { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleAddCredential = async () => {
    if (!newApiKey || !targetProjectId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: newApiKey, projectId: targetProjectId })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setIsAddCredentialOpen(false);
      setNewApiKey("");
      setTargetProjectId(null);
      await fetchData();
      alert("Credential added successfully");
    } catch (err: any) {
      alert("Invalid credential or error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCredentialAction = async (id: string, action: "ENABLE" | "DISABLE" | "REMOVE") => {
    if (action === "DISABLE" || action === "REMOVE") {
      const isZeroRoutes = data.routes - 1 <= 0;
      if (isZeroRoutes && !confirm("THIS ACTION WILL LEAVE KAIRO WITHOUT AI CAPACITY. Are you sure?")) return;
    }
    if (action === "REMOVE" && !confirm("Are you sure you want to remove this credential? It will be disabled permanently.")) return;

    try {
      const res = await fetch(`/api/admin/credentials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex h-full text-white items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full text-white p-8">
        <div className="w-full">
          <h1 className="text-3xl font-bold mb-8">AI Infrastructure</h1>
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">
            {error}
          </div>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-white relative">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">AI Infrastructure</h1>
        <div className="flex gap-4">
          <button
            onClick={() => setIsCreateProjectOpen(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
          >
            + Create Project
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {data?.warnings?.length > 0 && (
        <div className="mb-8 space-y-2">
          {data.warnings.map((w: string, i: number) => (
            <div key={i} className="bg-yellow-500/10 border border-yellow-500 text-yellow-500 p-3 rounded-lg text-sm font-medium">
              ⚠️ {w}
            </div>
          ))}
        </div>
      )}

      {/* OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
          <h3 className="text-zinc-400 text-sm mb-2">System Health</h3>
          <div className={`text-2xl font-bold ${
            data.health === 'HEALTHY' ? 'text-green-500' :
            data.health === 'DEGRADED' ? 'text-yellow-500' : 'text-red-500'
          }`}>
            {data.health}
          </div>
        </div>
        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
          <h3 className="text-zinc-400 text-sm mb-2">Projects (Healthy/Total)</h3>
          <div className="text-2xl font-bold">
            {data.projects.filter((p: any) => p.status === 'ACTIVE').length} / {data.projects.length}
          </div>
        </div>
        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
          <h3 className="text-zinc-400 text-sm mb-2">Credentials (Healthy/Total)</h3>
          <div className="text-2xl font-bold">
            {data.credentials.filter((c: any) => c.status === 'AVAILABLE' || c.status === 'ASSIGNED').length} / {data.credentials.length}
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            {data.credentials.filter((c: any) => c.cooldown_until && new Date(c.cooldown_until) > new Date()).length} in cooldown
          </div>
        </div>
        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
          <h3 className="text-zinc-400 text-sm mb-2">Available Routes</h3>
          <div className="text-2xl font-bold">{data.routes}</div>
        </div>
      </div>

      {/* METRICS */}
      <h2 className="text-xl font-bold mb-4">24h Metrics</h2>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <div className="text-xs text-zinc-400">Total Requests</div>
          <div className="text-lg font-mono">{data.metrics.totalRequests}</div>
        </div>
        <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <div className="text-xs text-zinc-400">Successful</div>
          <div className="text-lg font-mono text-green-500">{data.metrics.successfulRequests}</div>
        </div>
        <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <div className="text-xs text-zinc-400">Failed</div>
          <div className="text-lg font-mono text-red-500">{data.metrics.failedRequests}</div>
        </div>
        <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <div className="text-xs text-zinc-400">Prov. Attempts</div>
          <div className="text-lg font-mono">{data.metrics.providerAttempts}</div>
        </div>
        <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <div className="text-xs text-zinc-400">Failovers</div>
          <div className="text-lg font-mono text-yellow-500">{data.metrics.failovers}</div>
        </div>
        <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <div className="text-xs text-zinc-400">Avg Latency</div>
          <div className="text-lg font-mono">{data.metrics.averageLatency}ms</div>
        </div>
      </div>

      {/* DISTRIBUTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-xl font-bold mb-4">Model Usage</h2>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            {Object.keys(data.metrics.modelDistribution).length === 0 ? (
              <div className="text-zinc-500 text-sm">No recent usage</div>
            ) : (
              Object.entries(data.metrics.modelDistribution).map(([model, count]: [string, any]) => (
                <div key={model} className="flex justify-between items-center py-2 border-b border-zinc-800/50 last:border-0">
                  <span className="font-mono text-sm">{model}</span>
                  <span className="bg-white/10 px-2 py-1 rounded text-xs">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold mb-4">Failure Categories</h2>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            {Object.keys(data.metrics.failureCategories).length === 0 ? (
              <div className="text-zinc-500 text-sm">No recent failures</div>
            ) : (
              Object.entries(data.metrics.failureCategories).map(([cat, count]: [string, any]) => (
                <div key={cat} className="flex justify-between items-center py-2 border-b border-zinc-800/50 last:border-0">
                  <span className="font-mono text-sm text-red-400">{cat}</span>
                  <span className="bg-red-500/10 text-red-400 px-2 py-1 rounded text-xs">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODEL MATRIX */}
      <h2 className="text-xl font-bold mb-4">Model Matrix</h2>
      <div className="overflow-x-auto mb-8 bg-zinc-900 rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-800/50 text-zinc-400">
            <tr>
              <th className="p-4 font-medium">Model</th>
              {data.projects.map((p: any) => (
                <th key={p.id} className="p-4 font-medium">{p.display_name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(data.modelMatrix).map(([model, projectStatuses]: [string, any]) => (
              <tr key={model} className="border-t border-zinc-800">
                <td className="p-4 font-mono">{model}</td>
                {data.projects.map((p: any) => {
                  const status = projectStatuses[p.id];
                  return (
                    <td key={p.id} className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        status === 'AVAILABLE' ? 'bg-green-500/10 text-green-500' :
                        status === 'UNAVAILABLE' ? 'bg-red-500/10 text-red-500' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>
                        {status}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PROJECTS & CREDENTIALS */}
      <h2 className="text-xl font-bold mb-4">Projects & Credentials</h2>
      <div className="space-y-6 mb-8">
        {data.projects.length === 0 && (
            <div className="text-zinc-500">No projects found.</div>
        )}
        {data.projects.map((p: any) => (
          <div key={p.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <div className="p-4 bg-zinc-800/30 flex justify-between items-center border-b border-zinc-800">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="font-bold flex items-center gap-2">
                    {p.display_name}
                    <span className={`px-2 py-1 rounded text-[10px] ${p.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {p.status}
                    </span>
                  </h3>
                  <div className="text-xs text-zinc-500 font-mono mt-1">{p.external_project_id}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleRefreshModels(p.id)}
                  className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs transition-colors"
                >
                  Refresh Models
                </button>
                {p.status === "ACTIVE" ? (
                  <button 
                    onClick={() => handleProjectAction(p.id, "DISABLE")}
                    className="px-3 py-1 bg-red-600/20 text-red-500 hover:bg-red-600/30 rounded text-xs transition-colors"
                  >
                    Disable Project
                  </button>
                ) : (
                  <button 
                    onClick={() => handleProjectAction(p.id, "ENABLE")}
                    className="px-3 py-1 bg-green-600/20 text-green-500 hover:bg-green-600/30 rounded text-xs transition-colors"
                  >
                    Enable Project
                  </button>
                )}
              </div>
            </div>
            <div className="p-4 overflow-x-auto">
              <div className="mb-4 flex justify-between items-center">
                <h4 className="text-sm font-semibold">Credentials</h4>
                <button 
                  onClick={() => {
                    setTargetProjectId(p.id);
                    setIsAddCredentialOpen(true);
                  }}
                  className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                >
                  + Add Credential
                </button>
              </div>
              <table className="w-full text-sm">
                <thead className="text-zinc-400 text-xs uppercase text-left">
                  <tr>
                    <th className="pb-2">Credential ID</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Priority</th>
                    <th className="pb-2">Failures</th>
                    <th className="pb-2">Last Used</th>
                    <th className="pb-2">Cooldown</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {data.credentials.filter((c: any) => c.project_id === p.id).length === 0 && (
                    <tr><td colSpan={7} className="py-4 text-center text-zinc-500 text-xs">NO CREDENTIALS</td></tr>
                  )}
                  {data.credentials.filter((c: any) => c.project_id === p.id).map((c: any) => {
                    const isCooldown = c.cooldown_until && new Date(c.cooldown_until) > new Date();
                    return (
                      <tr key={c.id}>
                        <td className="py-2 font-mono text-xs">{c.id.slice(0, 13)}...</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            isCooldown ? 'bg-yellow-500/10 text-yellow-500' :
                            c.status === 'DISABLED' ? 'bg-red-500/10 text-red-500' :
                            'bg-green-500/10 text-green-500'
                          }`}>
                            {isCooldown ? 'COOLDOWN' : c.status}
                          </span>
                        </td>
                        <td className="py-2 text-zinc-400">{c.priority}</td>
                        <td className="py-2 text-zinc-400">{c.failure_count}</td>
                        <td className="py-2 text-zinc-400 text-xs">
                          {c.last_used_at ? new Date(c.last_used_at).toLocaleTimeString() : 'Never'}
                        </td>
                        <td className="py-2 text-zinc-400 text-xs">
                          {isCooldown ? `Until ${new Date(c.cooldown_until).toLocaleTimeString()}` : '-'}
                        </td>
                        <td className="py-2 text-right space-x-2">
                          {c.status !== "DISABLED" ? (
                            <button onClick={() => handleCredentialAction(c.id, "DISABLE")} className="text-[10px] text-zinc-400 hover:text-white px-2 py-1 bg-white/5 rounded">Disable</button>
                          ) : (
                            <button onClick={() => handleCredentialAction(c.id, "ENABLE")} className="text-[10px] text-zinc-400 hover:text-white px-2 py-1 bg-white/5 rounded">Enable</button>
                          )}
                          <button onClick={() => handleCredentialAction(c.id, "REMOVE")} className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1 bg-red-500/10 rounded">Remove</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* RECENT ACTIVITY */}
      <h2 className="text-xl font-bold mb-4">Recent Router Activity</h2>
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-x-auto mb-8">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-800/50 text-zinc-400">
            <tr>
              <th className="p-4 font-medium">Time</th>
              <th className="p-4 font-medium">Req ID</th>
              <th className="p-4 font-medium">Task</th>
              <th className="p-4 font-medium">Model</th>
              <th className="p-4 font-medium">Attempt</th>
              <th className="p-4 font-medium">Latency</th>
              <th className="p-4 font-medium">Result</th>
              <th className="p-4 font-medium">Failure Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {data.recentActivity.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-center text-zinc-500">No recent activity</td>
              </tr>
            ) : (
              data.recentActivity.map((log: any, i: number) => (
                <tr key={i}>
                  <td className="p-4 text-xs text-zinc-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="p-4 font-mono text-xs">{log.requestId.slice(0, 8)}</td>
                  <td className="p-4 text-xs">{log.taskType}</td>
                  <td className="p-4 font-mono text-xs">{log.modelId || '-'}</td>
                  <td className="p-4 text-xs">{log.attemptNumber}</td>
                  <td className="p-4 text-xs">{log.latencyMs}ms</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[10px] ${
                      log.result === 'SUCCESS' ? 'bg-green-500/10 text-green-500' :
                      log.result.includes('FAILOVER') ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {log.result}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-zinc-400">{log.failureCategory || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE PROJECT MODAL */}
      {isCreateProjectOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Provider Project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Display Name</label>
                <input 
                  type="text" 
                  value={newProjectName} 
                  onChange={e => setNewProjectName(e.target.value)} 
                  className="w-full bg-black border border-zinc-800 rounded p-2 text-white"
                  placeholder="e.g. Kairo Primary"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">External Project ID</label>
                <input 
                  type="text" 
                  value={newProjectId} 
                  onChange={e => setNewProjectId(e.target.value)} 
                  className="w-full bg-black border border-zinc-800 rounded p-2 text-white"
                  placeholder="e.g. gcp-project-id"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setIsCreateProjectOpen(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateProject}
                disabled={isSubmitting || !newProjectName || !newProjectId}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded transition-colors text-white"
              >
                {isSubmitting ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CREDENTIAL MODAL */}
      {isAddCredentialOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Gemini Credential</h2>
            <div className="text-sm text-zinc-400 mb-4">
              Project: {data.projects.find((p: any) => p.id === targetProjectId)?.display_name}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">API Key</label>
                <input 
                  type="password" 
                  value={newApiKey} 
                  onChange={e => setNewApiKey(e.target.value)} 
                  className="w-full bg-black border border-zinc-800 rounded p-2 text-white font-mono"
                  placeholder="AIzaSy..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => {
                  setIsAddCredentialOpen(false);
                  setNewApiKey("");
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddCredential}
                disabled={isSubmitting || !newApiKey}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded transition-colors text-white"
              >
                {isSubmitting ? "VALIDATING..." : "Validate & Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
