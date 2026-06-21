"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin } from "lucide-react";

import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const robotColors = ["#3B82F6", "#10B981", "#F59E0B"];

function MapController({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

function RobotRoute({ robot, index }) {
  const wps = robot.waypoints || [];
  if (wps.length < 2) return null;
  const positions = wps.map(w => [w.lat, w.lon]);
  const color = robotColors[index % robotColors.length];
  const curWp = robot.current_wp || 0;

  return (
    <>
      <Polyline positions={positions} pathOptions={{ color, weight: 2, dashArray: "6 4", opacity: 0.6 }} />
      {wps.map((wp, i) => {
        const done = i < curWp;
        const isCurrent = i === curWp;
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:${isCurrent ? 14 : 10}px;height:${isCurrent ? 14 : 10}px;border-radius:50%;background:${done ? "#9CA3AF" : isCurrent ? color : "#fff"};border:2px solid ${color};box-shadow:0 1px 4px rgba(0,0,0,0.2)"></div>`,
          iconSize: [isCurrent ? 14 : 10, isCurrent ? 14 : 10],
          iconAnchor: [isCurrent ? 7 : 5, isCurrent ? 7 : 5],
        });
        return (
          <Marker key={i} position={[wp.lat, wp.lon]} icon={icon}>
            <Popup>
              <div className="text-xs">
                <p className="font-semibold">{robot.id} — {wp.label}</p>
                <p className="text-gray-500">{wp.lat.toFixed(4)}, {wp.lon.toFixed(4)}</p>
                <p className="text-gray-400 mt-1">{done ? "Visited" : isCurrent ? "Current" : "Pending"}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export default function LiveMap({ data, robots }) {
  const points = (data || []).filter(d => d.latitude && d.latitude > 1 && d.longitude).slice(0, 100);
  const center = points.length > 0 ? [points[0].latitude, points[0].longitude] : [3.1157, 101.5915];
  const activeRobots = (robots || []).filter(r => r.waypoints && r.waypoints.length > 0);

  return (
    <div className="lg:col-span-2 bg-white rounded-xl border border-[#E9ECEF] shadow flex flex-col overflow-hidden">
      <div className="p-5 border-b flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-[#3B82F6]" /> Live Device Tracking</h3>
        <div className="flex gap-3 text-xs text-[#868E96]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" /> Normal</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Hot</span>
        </div>
      </div>
      <div className="h-[400px] w-full z-0">
        <MapContainer center={center} zoom={15} className="h-full w-full" scrollWheelZoom={true}>
          <MapController center={center} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {activeRobots.map((r, ri) => <RobotRoute key={ri} robot={r} index={ri} />)}
          {points.map((pt, i) => {
            const isHot = pt.temperature_c > 32;
            const icon = L.divIcon({
              className: "",
              html: `<div style="width:16px;height:16px;border-radius:50%;background:${isHot ? "#EF4444" : "#3B82F6"};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            });
            return (
              <Marker key={i} position={[pt.latitude, pt.longitude]} icon={icon}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold text-sm mb-1">{pt.device_id}</p>
                    <p>Temp: <b>{pt.temperature_c}°C</b></p>
                    <p>Humidity: {pt.humidity_percent}%</p>
                    <p>CO: {pt.co_raw} ppm</p>
                    <p className="text-gray-500 mt-1">{pt.latitude.toFixed(4)}, {pt.longitude.toFixed(4)}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
