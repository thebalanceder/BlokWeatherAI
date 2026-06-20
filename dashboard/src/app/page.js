"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity, TrendingUp, TrendingDown, Thermometer, Sparkles, Truck,
  Settings, Bell, ChevronDown, User, LayoutDashboard, History,
  Download, Plus, ListTree, Menu, X, RefreshCw,
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  ComposedChart, Bar, ReferenceLine
} from "recharts";
import dynamic from "next/dynamic";
import * as api from "@/lib/api";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { ssr: false });

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "fleet", label: "Robot Fleet", icon: Truck },
  { id: "history", label: "History", icon: History },
  { id: "settings", label: "Settings", icon: Settings },
];

const STATUS_BADGE = {
  online: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  offline: "bg-gray-100 text-gray-500",
};

const EVENT_COLORS = {
  DEBUG: "text-blue-400", INFO: "text-emerald-400",
  WARN: "text-amber-400", ERROR: "text-red-400",
};

const TYPE_STYLES = {
  anomaly: "bg-blue-50 border-l-4 border-[#3B82F6]",
  trend: "bg-gray-50 border-l-4 border-gray-400",
  alert: "bg-orange-50 border-l-4 border-orange-500",
  tip: "bg-purple-50 border-l-4 border-purple-500",
  analysis: "bg-emerald-50 border-l-4 border-emerald-500",
  prediction: "bg-indigo-50 border-l-4 border-indigo-500",
};

const TYPE_TITLES = {
  anomaly: "ANOMALY DETECTED", trend: "TREND ANALYSIS", alert: "PREDICTIVE ALERT",
  tip: "OPTIMIZATION TIP", analysis: "AI ANALYSIS", prediction: "PREDICTION",
};

const TYPE_COLORS = {
  anomaly: "text-[#3B82F6]", trend: "text-gray-600", alert: "text-orange-600",
  tip: "text-purple-600", analysis: "text-emerald-600", prediction: "text-indigo-600",
};

function MetricCard({ title, value, unit, trend, trendUp, status, icon: Icon, iconColor }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-[#E9ECEF] shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
      <div className="flex justify-between items-start">
        <span className="text-sm font-medium text-[#868E96]">{title}</span>
        {trend ? (
          <span className={`flex items-center text-xs font-semibold ${trendUp ? "text-[#EF4444]" : "text-[#10B981]"}`}>
            {trendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}{trend}
          </span>
        ) : status ? (
          <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
            status === "danger" ? "bg-red-100 text-red-700" :
            status === "warning" ? "bg-amber-100 text-amber-700" :
            "bg-emerald-100 text-emerald-700"
          }`}>{status}</span>
        ) : null}
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div className="flex items-baseline">
          <span className="text-3xl font-semibold">{value ?? "--"}</span>
          {unit && <span className="text-xl font-medium text-[#868E96] ml-1">{unit}</span>}
        </div>
        {Icon && <Icon className={`text-3xl ${iconColor || "text-[#3B82F6]"}`} />}
      </div>
    </div>
  );
}

function MetricCards({ stats }) {
  const t = stats?.latest?.temperature_c;
  const h = stats?.latest?.humidity_percent;
  const co = stats?.latest?.co_raw;
  const hi = stats?.latest?.heat_index_c;
  const cl = stats?.latest?.co_level || "low";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard title="Temperature" value={t} unit="°C" />
      <MetricCard title="Humidity" value={h} unit="%" />
      <MetricCard title="CO Level" value={co} unit="ppm"
        status={cl === "high" ? "danger" : cl === "medium" ? "warning" : "optimal"} />
      <MetricCard title="Heat Index" value={hi} unit="°C"
        status={hi > 40 ? "warning" : "normal"} icon={Thermometer} iconColor="text-orange-400" />
    </div>
  );
}

function MapController({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

function AIInsights({ insights, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#E9ECEF] shadow flex flex-col">
        <div className="p-5 border-b flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#3B82F6]" />AI Insights</h3>
          <span className="text-[10px] text-white bg-gray-900 px-2 py-0.5 rounded font-mono">GROQ</span>
        </div>
        <div className="p-5 flex-1 flex items-center justify-center text-sm text-[#868E96]">
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Loading insights...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E9ECEF] shadow flex flex-col">
      <div className="p-5 border-b flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#3B82F6]" />AI Insights</h3>
        <span className="text-[10px] text-white bg-gray-900 px-2 py-0.5 rounded font-mono">GROQ L4</span>
      </div>
      <div className="p-5 flex-1 overflow-y-auto space-y-3 max-h-[400px]">
        {(insights || []).map((item, i) => (
          <div key={i} className={`p-4 rounded-lg ${TYPE_STYLES[item.type] || "bg-gray-50 border-l-4 border-gray-400"}`}>
            <p className={`text-xs font-bold uppercase mb-1 ${TYPE_COLORS[item.type] || "text-gray-600"}`}>
              {TYPE_TITLES[item.type] || (item.type || "").toUpperCase()}
            </p>
            <p className="text-sm leading-relaxed">{item.title && <span className="font-semibold">{item.title}: </span>}{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartsRow({ historyData, prediction }) {
  const chartData = (historyData || []).slice(-24).map(r => ({
    time: new Date((r.timestamp || 0) * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    temp: r.temperature_c, humidity: r.humidity_percent, co: r.co_raw,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white p-5 rounded-xl border border-[#E9ECEF] shadow">
        <h3 className="text-sm font-semibold mb-4">Temp & Humidity (24h)</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid stroke="#E9ECEF" strokeDasharray="4" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#868E96" }} />
              <YAxis yAxisId="l" tick={{ fontSize: 10, fill: "#868E96" }} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: "#868E96" }} />
              <ReTooltip />
              <Bar yAxisId="l" dataKey="temp" fill="#3B82F6" radius={[2, 2, 0, 0]} barSize={8} name="Temp (°C)" />
              <Line yAxisId="r" dataKey="humidity" stroke="#10B981" strokeWidth={2} dot={false} name="Humidity (%)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-white p-5 rounded-xl border border-[#E9ECEF] shadow">
        <h3 className="text-sm font-semibold mb-4">CO Level Trend</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs><linearGradient id="coG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#EF4444" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="#E9ECEF" strokeDasharray="4" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#868E96" }} />
              <YAxis tick={{ fontSize: 10, fill: "#868E96" }} />
              <ReTooltip />
              <Area type="monotone" dataKey="co" stroke="#EF4444" fill="url(#coG)" strokeWidth={2} name="CO (ppm)" />
              <ReferenceLine y={300} stroke="#F59E0B" strokeDasharray="4" label={{ value: "Threshold", fontSize: 10, fill: "#F59E0B" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <PredictionCard prediction={prediction} />
    </div>
  );
}

function PredictionCard({ prediction }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-[#E9ECEF] shadow flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold">1h Forecast</h3>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${(prediction?.confidence || 0) > 70 ? "bg-blue-50 text-[#3B82F6]" : "bg-amber-50 text-amber-600"}`}>
            Confidence: {prediction?.confidence ?? "--"}%
          </span>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#868E96]">Current</span>
            <span className="text-sm font-mono font-medium">{prediction?.actual_temp ?? "--"}°C</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#868E96]">Predicted (next hour)</span>
            <span className="text-sm font-mono font-medium text-[#3B82F6]">{prediction?.predicted_temp ?? "--"}°C</span>
          </div>
          {prediction?.direction && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#868E96]">Trend</span>
              <span className={`text-xs font-semibold flex items-center gap-1 ${prediction.direction === "up" ? "text-[#EF4444]" : "text-[#10B981]"}`}>
                {prediction.direction === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {prediction.direction === "up" ? "Rising" : "Falling"}
              </span>
            </div>
          )}
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className="bg-[#3B82F6] h-full rounded-full" style={{ width: `${Math.min(100, ((prediction?.predicted_temp || 0) / 50) * 100)}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-[10px] leading-relaxed text-[#868E96]">
          Model: online regression on humidity, CO, heat index. Retrains every 5 min{prediction?.avg_trend ? ` with avg ${prediction.avg_trend}°C baseline` : ""}.
        </p>
      </div>
    </div>
  );
}

function RobotTable({ robots }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newRobot, setNewRobot] = useState({ id: "", action: "" });

  const exportCSV = () => {
    const headers = "Robot ID,Status,Action,RPM,Lidar Gap,Last Ping\n";
    const rows = (robots || []).map(r => `${r.id},${r.status},${r.action},${r.rpm},${r.lidar_gap}%,${r.last_ping}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url; a.download = "robot_fleet.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const addRobot = () => {
    if (!newRobot.id) return;
    robots.push({ id: newRobot.id, status: "online", action: newRobot.action || "Idle", rpm: 0, lidar_gap: 100, last_ping: "just now" });
    setNewRobot({ id: "", action: "" });
    setShowAdd(false);
  };

  return (
    <div className="bg-white rounded-xl border border-[#E9ECEF] shadow">
      <div className="p-5 border-b flex justify-between items-center">
        <h3 className="font-semibold">Robot Fleet Operations</h3>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="px-3 py-1.5 text-xs border border-[#E9ECEF] rounded-lg hover:bg-gray-50 flex items-center gap-1.5 transition-colors">
            <Download className="w-3 h-3" /> Export CSV
          </button>
          <button onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 text-xs bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] flex items-center gap-1.5 transition-colors">
            <Plus className="w-3 h-3" /> Add Robot
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-[#E9ECEF]">
              <th className="px-6 py-3 text-[11px] font-bold text-[#868E96] uppercase tracking-wider">Robot ID</th>
              <th className="px-6 py-3 text-[11px] font-bold text-[#868E96] uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-[11px] font-bold text-[#868E96] uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-[11px] font-bold text-[#868E96] uppercase tracking-wider text-right">RPM</th>
              <th className="px-6 py-3 text-[11px] font-bold text-[#868E96] uppercase tracking-wider">Obstacle Gap</th>
              <th className="px-6 py-3 text-[11px] font-bold text-[#868E96] uppercase tracking-wider">Last Ping</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E9ECEF]">
            {(robots || []).map((r, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs">{r.id}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[r.status] || "bg-gray-100 text-gray-500"}`}>{r.status?.toUpperCase()}</span>
                </td>
                <td className="px-6 py-4 text-xs font-medium">{r.action}</td>
                <td className="px-6 py-4 text-xs text-right font-mono">{r.rpm?.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${r.lidar_gap > 70 ? "bg-emerald-400" : r.lidar_gap > 30 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${r.lidar_gap || 0}%` }} />
                    </div>
                    <span className="text-[10px] text-[#868E96]">{r.lidar_gap || 0}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-[#868E96]">{r.last_ping}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-4">Add New Robot</h3>
            <input value={newRobot.id} onChange={e => setNewRobot(p => ({ ...p, id: e.target.value }))}
              placeholder="Robot ID (e.g. NX-500-GAMMA)"
              className="w-full px-3 py-2 mb-3 text-sm border border-[#E9ECEF] rounded-lg focus:outline-none focus:border-[#3B82F6]" />
            <input value={newRobot.action} onChange={e => setNewRobot(p => ({ ...p, action: e.target.value }))}
              placeholder="Action (optional)"
              className="w-full px-3 py-2 mb-4 text-sm border border-[#E9ECEF] rounded-lg focus:outline-none focus:border-[#3B82F6]" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)}
                className="px-4 py-2 text-xs border border-[#E9ECEF] rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={addRobot}
                className="px-4 py-2 text-xs bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB]">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventStream({ events }) {
  return (
    <div className="bg-white rounded-xl border border-[#E9ECEF] shadow overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-[#E9ECEF] flex items-center gap-2">
        <ListTree className="w-4 h-4 text-gray-500" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#868E96]">Live MQTT Stream</h3>
      </div>
      <div className="bg-gray-900 p-4 font-mono text-[11px] leading-6 space-y-1 h-48 overflow-y-auto">
        {(events || []).slice(0, 40).map((e, i) => (
          <div key={i} className="flex gap-4">
            <span className="text-gray-500 shrink-0">{e.timestamp}</span>
            <span className={`font-bold uppercase w-14 shrink-0 ${EVENT_COLORS[e.level] || "text-gray-400"}`}>{e.level}</span>
            <span className="text-gray-300 truncate">{e.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataTable({ data }) {
  const [search, setSearch] = useState("");
  const filtered = (data || []).filter(r =>
    !search || (r.device_id || "").toLowerCase().includes(search.toLowerCase())
  ).slice(0, 20);

  const exportCSV = () => {
    const headers = "Time,Device,Temp (C),Hum (%),CO (ppm),GPS\n";
    const rows = filtered.map(r =>
      `${new Date((r.timestamp || 0) * 1000).toLocaleTimeString()},${r.device_id},${r.temperature_c ?? ""},${r.humidity_percent ?? ""},${r.co_raw ?? ""},"${r.latitude && r.latitude > 1 ? `${r.latitude},${r.longitude}` : ""}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "sensor_readings.csv"; a.click();
  };

  return (
    <div className="bg-white rounded-xl border border-[#E9ECEF] shadow">
      <div className="p-5 border-b flex flex-wrap justify-between items-center gap-3">
        <h3 className="font-semibold">Recent Sensor Readings</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#868E96]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Search device..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-[#E9ECEF] rounded-lg focus:outline-none focus:border-[#3B82F6] w-48" />
          </div>
          <button onClick={exportCSV} className="p-1.5 text-xs border border-[#E9ECEF] rounded-lg hover:bg-gray-50">
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-[#E9ECEF]">
              <th className="px-6 py-3 text-[11px] font-bold text-[#868E96] uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-[11px] font-bold text-[#868E96] uppercase tracking-wider">Device</th>
              <th className="px-6 py-3 text-[11px] font-bold text-[#868E96] uppercase tracking-wider text-right">Temp (°C)</th>
              <th className="px-6 py-3 text-[11px] font-bold text-[#868E96] uppercase tracking-wider text-right">Hum (%)</th>
              <th className="px-6 py-3 text-[11px] font-bold text-[#868E96] uppercase tracking-wider text-right">CO (ppm)</th>
              <th className="px-6 py-3 text-[11px] font-bold text-[#868E96] uppercase tracking-wider">GPS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E9ECEF]">
            {filtered.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-xs text-[#868E96] mono">{new Date((r.timestamp || 0) * 1000).toLocaleTimeString()}</td>
                <td className="px-6 py-3 text-xs font-mono">{r.device_id}</td>
                <td className="px-6 py-3 text-xs text-right mono">{r.temperature_c ?? "--"}</td>
                <td className="px-6 py-3 text-xs text-right mono">{r.humidity_percent ?? "--"}</td>
                <td className="px-6 py-3 text-xs text-right mono">{r.co_raw ?? "--"}</td>
                <td className="px-6 py-3 text-xs mono">{r.latitude && r.latitude > 1 ? `${r.latitude.toFixed(4)}, ${r.longitude?.toFixed(4)}` : "--"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FleetView({ robots }) {
  const [search, setSearch] = useState("");
  const filtered = (robots || []).filter(r =>
    !search || r.id.toLowerCase().includes(search.toLowerCase()) || r.action.toLowerCase().includes(search.toLowerCase())
  );
  const [showAdd, setShowAdd] = useState(false);
  const [newRobot, setNewRobot] = useState({ id: "", action: "" });

  const exportCSV = () => {
    const headers = "Robot ID,Status,Action,RPM,Lidar Gap,Last Ping\n";
    const rows = filtered.map(r => `${r.id},${r.status},${r.action},${r.rpm},${r.lidar_gap}%,${r.last_ping}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url; a.download = "fleet_export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const addRobot = () => {
    if (!newRobot.id) return;
    robots.push({ id: newRobot.id, status: "online", action: newRobot.action || "Idle", rpm: 0, lidar_gap: 100, last_ping: "just now" });
    setNewRobot({ id: "", action: "" });
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">Robot Fleet</h2>
          <p className="text-sm text-[#868E96]">{filtered.length} robots deployed</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#868E96]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Search robots..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-[#E9ECEF] rounded-lg focus:outline-none focus:border-[#3B82F6] w-48" />
          </div>
          <button onClick={exportCSV}
            className="px-3 py-1.5 text-xs border border-[#E9ECEF] rounded-lg hover:bg-gray-50 flex items-center gap-1.5"><Download className="w-3 h-3" /> Export</button>
          <button onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 text-xs bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] flex items-center gap-1.5"><Plus className="w-3 h-3" /> Add Robot</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-[#E9ECEF] shadow overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-[#E9ECEF]">
              <th className="px-6 py-3 text-[11px] font-bold text-[#868E96] uppercase tracking-wider">Robot ID</th>
              <th className="px-6 py-3 text-[11px] font-bold text-[#868E96] uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-[11px] font-bold text-[#868E96] uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-[11px] font-bold text-[#868E96] uppercase tracking-wider text-right">RPM</th>
              <th className="px-6 py-3 text-[11px] font-bold text-[#868E96] uppercase tracking-wider">Obstacle Gap</th>
              <th className="px-6 py-3 text-[11px] font-bold text-[#868E96] uppercase tracking-wider">Last Ping</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E9ECEF]">
            {filtered.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-xs">{r.id}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[r.status] || "bg-gray-100 text-gray-500"}`}>{r.status?.toUpperCase()}</span>
                </td>
                <td className="px-6 py-4 text-xs font-medium">{r.action}</td>
                <td className="px-6 py-4 text-xs text-right font-mono">{r.rpm?.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${r.lidar_gap > 70 ? "bg-emerald-400" : r.lidar_gap > 30 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${r.lidar_gap || 0}%` }} />
                    </div>
                    <span className="text-[10px] text-[#868E96]">{r.lidar_gap || 0}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-[#868E96]">{r.last_ping}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-4">Add New Robot</h3>
            <input value={newRobot.id} onChange={e => setNewRobot(p => ({ ...p, id: e.target.value }))}
              placeholder="Robot ID (e.g. NX-500-GAMMA)"
              className="w-full px-3 py-2 mb-3 text-sm border border-[#E9ECEF] rounded-lg focus:outline-none focus:border-[#3B82F6]" />
            <input value={newRobot.action} onChange={e => setNewRobot(p => ({ ...p, action: e.target.value }))}
              placeholder="Action (optional)"
              className="w-full px-3 py-2 mb-4 text-sm border border-[#E9ECEF] rounded-lg focus:outline-none focus:border-[#3B82F6]" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-xs border border-[#E9ECEF] rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={addRobot} className="px-4 py-2 text-xs bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB]">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryView({ historyData }) {
  const chartData = (historyData || []).slice(-48).map(r => ({
    time: new Date((r.timestamp || 0) * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    temp: r.temperature_c, humidity: r.humidity_percent, co: r.co_raw,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">History Timeline</h2>
        <p className="text-sm text-[#868E96]">{historyData?.length || 0} data points</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-[#E9ECEF] shadow">
          <h3 className="text-sm font-semibold mb-4">Temperature</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="tempG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#E9ECEF" strokeDasharray="4" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#868E96" }} />
                <YAxis tick={{ fontSize: 10, fill: "#868E96" }} />
                <ReTooltip />
                <Area type="monotone" dataKey="temp" stroke="#3B82F6" fill="url(#tempG)" strokeWidth={2} name="Temp (°C)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E9ECEF] shadow">
          <h3 className="text-sm font-semibold mb-4">Humidity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="humG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10B981" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#E9ECEF" strokeDasharray="4" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#868E96" }} />
                <YAxis tick={{ fontSize: 10, fill: "#868E96" }} />
                <ReTooltip />
                <Area type="monotone" dataKey="humidity" stroke="#10B981" fill="url(#humG)" strokeWidth={2} name="Humidity (%)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="bg-white p-5 rounded-xl border border-[#E9ECEF] shadow">
        <h3 className="text-sm font-semibold mb-4">CO Levels</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs><linearGradient id="coG2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#EF4444" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="#E9ECEF" strokeDasharray="4" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#868E96" }} />
              <YAxis tick={{ fontSize: 10, fill: "#868E96" }} />
              <ReTooltip />
              <Area type="monotone" dataKey="co" stroke="#EF4444" fill="url(#coG2)" strokeWidth={2} name="CO (ppm)" />
              <ReferenceLine y={300} stroke="#F59E0B" strokeDasharray="4" label={{ value: "Threshold", fontSize: 10, fill: "#F59E0B" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function SettingsView({ stats, workspace }) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold">Settings</h2>
        <p className="text-sm text-[#868E96]">System configuration and preferences</p>
      </div>
      <div className="bg-white rounded-xl border border-[#E9ECEF] shadow divide-y">
        <div className="p-5">
          <h3 className="text-sm font-semibold mb-1">Workspace</h3>
          <p className="text-xs text-[#868E96] mb-3">Current active workspace: <b>{workspace}</b></p>
          <p className="text-xs text-[#868E96]">Cycle via the dropdown in the header</p>
        </div>
        <div className="p-5">
          <h3 className="text-sm font-semibold mb-1">Data Source</h3>
          <p className="text-xs text-[#868E96] mb-1">Backend API: localhost:8000</p>
          <p className="text-xs text-[#868E96]">Total records: {stats?.count || 0}</p>
        </div>
        <div className="p-5">
          <h3 className="text-sm font-semibold mb-1">AI Model</h3>
          <p className="text-xs text-[#868E96] mb-1">Groq L4 (llama-3.3-70b-versatile) for insights</p>
          <p className="text-xs text-[#868E96]">Online regression retrains every 5 min</p>
        </div>
        <div className="p-5">
          <h3 className="text-sm font-semibold mb-1">Map</h3>
          <p className="text-xs text-[#868E96] mb-1">Leaflet + OpenStreetMap tiles</p>
          <p className="text-xs text-[#868E96]">Scroll to zoom, click markers for details</p>
        </div>
        <div className="p-5">
          <h3 className="text-sm font-semibold mb-1">Alerts</h3>
          <p className="text-xs text-[#868E96]">CO thresholds: medium &gt;50ppm, high &gt;300ppm</p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState("overview");
  const [stats, setStats] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [robots, setRobots] = useState([]);
  const [events, setEvents] = useState([]);
  const [insights, setInsights] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("realtime");
  const [dataTable, setDataTable] = useState([]);
  const [notifCount, setNotifCount] = useState(3);
  const [notifOpen, setNotifOpen] = useState(false);
  const [workspace, setWorkspace] = useState("Global HQ");

  const hoursMap = { realtime: 1, "24h": 24, "7d": 168 };

  const fetchAll = useCallback(async () => {
    try {
      const h = hoursMap[timeRange];
      const [s, hist, r, e, i, p, d] = await Promise.all([
        api.getStats(h), api.getHistory(h), api.getRobotState(),
        api.getEvents(30), api.getInsights(), api.getPrediction(), api.getRecent(50)
      ]);
      setStats(s); setHistoryData(hist); setRobots(r);
      setEvents(e); setInsights(i); setPrediction(p); setDataTable(d);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => { fetchAll(); const iv = setInterval(fetchAll, 15000); return () => clearInterval(iv); }, [fetchAll]);

  const workspaces = ["Global HQ", "Lab A", "Site B", "Mobile Unit"];
  const cycleWorkspace = () => {
    const idx = workspaces.indexOf(workspace);
    setWorkspace(workspaces[(idx + 1) % workspaces.length]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FA]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-[#E9ECEF] flex flex-col transition-all duration-300 ${sidebarOpen ? "w-64" : "w-0 -translate-x-full lg:w-16 lg:translate-x-0"}`}>
        <div className="p-5 flex items-center gap-3 border-b border-[#E9ECEF]">
          <div className="w-8 h-8 bg-gradient-to-br from-[#3B82F6] to-[#2563EB] rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          {sidebarOpen && <span className="font-semibold text-[#212529]">BlokWeather Ai</span>}
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <button key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeNav === item.id ? "bg-blue-50 text-[#3B82F6] font-medium" : "text-[#6B7280] hover:bg-gray-50"}`}>
              <item.icon className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[#E9ECEF]">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">BW</div>
            {sidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">BlokWeather Admin</p>
                <p className="text-xs text-[#868E96] truncate">Enterprise Plan</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <button onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white border border-[#E9ECEF] p-2 rounded-lg shadow-sm">
        {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      <main className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-16"}`}>
        <header className="sticky top-0 h-16 bg-white border-b border-[#E9ECEF] flex items-center justify-between px-4 lg:px-8 z-40">
          <div className="flex items-center gap-4">
            <button onClick={cycleWorkspace}
              className="hidden lg:flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors">
              <span className="text-xs font-semibold text-[#868E96] uppercase tracking-wider">Workspace:</span>
              <span className="text-sm font-medium">{workspace}</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {["realtime", "24h", "7d"].map(r => (
                <button key={r} onClick={() => setTimeRange(r)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${timeRange === r ? "bg-white shadow-sm" : "text-[#6B7280] hover:text-gray-800"}`}>
                  {r === "realtime" ? "Real-time" : r}
                </button>
              ))}
            </div>
            <div className="relative">
              <button onClick={() => { setNotifOpen(!notifOpen); if (notifOpen) setNotifCount(0); }} className="p-2 text-[#6B7280] hover:text-[#3B82F6] relative">
                <Bell className="w-5 h-5" />
                {notifCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full" />}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E9ECEF] rounded-xl shadow-xl z-50">
                  <div className="p-3 border-b flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-[#868E96]">Notifications ({events.length})</span>
                    <button onClick={() => { setNotifCount(0); setNotifOpen(false); }} className="text-[10px] text-[#3B82F6] hover:underline">Dismiss all</button>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                    {(events || []).slice(0, 15).map((e, i) => (
                      <div key={i} className="flex gap-2 p-2 rounded-lg hover:bg-gray-50 text-xs">
                        <span className={`font-bold shrink-0 ${EVENT_COLORS[e.level] || "text-gray-400"}`}>{e.level}</span>
                        <span className="text-gray-700 truncate">{e.message}</span>
                        <span className="text-gray-400 shrink-0 ml-auto">{e.timestamp}</span>
                      </div>
                    ))}
                    {(!events || events.length === 0) && <p className="text-xs text-gray-400 p-2">No notifications</p>}
                  </div>
                </div>
              )}
            </div>
            <button onClick={fetchAll} className="p-2 text-[#6B7280] hover:text-[#3B82F6]" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
          {activeNav === "overview" && (
            <>
              <MetricCards stats={stats} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <LiveMap data={historyData} />
                <AIInsights insights={insights} loading={false} />
              </div>
              <ChartsRow historyData={historyData} prediction={prediction} />
              <RobotTable robots={robots} />
              <DataTable data={dataTable} />
              <EventStream events={events} />
            </>
          )}
          {activeNav === "fleet" && <FleetView robots={robots} />}
          {activeNav === "history" && <HistoryView historyData={historyData} />}
          {activeNav === "settings" && <SettingsView stats={stats} workspace={workspace} />}
        </div>
      </main>
    </div>
  );
}
