import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { Navigation, Compass, Route as RouteIcon, X, Car, ChevronRight, Bike, Footprints } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface UserProfile {
  uid: string;
  name: string;
  skillHave: string;
  skillWant: string;
  location?: { lat: number; lng: number };
}

interface RouteInfo {
  distance: number;
  time: number;
  instructions: any[];
}

type TransportMode = 'driving' | 'walking' | 'cycling';

function RoutingControl({ start, end, onRouteFound, transportMode }: { start: [number, number], end: [number, number], onRouteFound: (info: RouteInfo) => void, transportMode: TransportMode }) {
  const map = useMap();

  // Extract primitives to avoid re-running effect on every render due to new array references
  const startLat = start[0];
  const startLng = start[1];
  const endLat = end[0];
  const endLng = end[1];

  useEffect(() => {
    if (!startLat || !startLng || !endLat || !endLng) return;

    // Suppress the annoying OSRM demo server console warning
    const originalWarn = console.warn;
    console.warn = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes("OSRM's demo server")) return;
      originalWarn(...args);
    };

    // @ts-ignore
    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(startLat, startLng),
        L.latLng(endLat, endLng)
      ],
      router: L.Routing.osrmv1({
        serviceUrl: transportMode === 'walking' 
          ? 'https://routing.openstreetmap.de/routed-foot/route/v1'
          : transportMode === 'cycling'
            ? 'https://routing.openstreetmap.de/routed-bike/route/v1'
            : 'https://routing.openstreetmap.de/routed-car/route/v1',
        profile: transportMode === 'walking' ? 'foot' : transportMode === 'cycling' ? 'bike' : 'car'
      }),
      lineOptions: {
        styles: [{ color: "#3b82f6", weight: 4, opacity: 0.8 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      },
      show: false, // Hide the text instructions
      addWaypoints: false,
      routeWhileDragging: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      // @ts-ignore
      createMarker: () => null // don't create extra markers for waypoints
    }).addTo(map);

    // Restore console.warn immediately after initialization
    console.warn = originalWarn;

    routingControl.on('routesfound', function(e: any) {
      const routes = e.routes;
      const summary = routes[0].summary;
      onRouteFound({
        distance: summary.totalDistance,
        time: summary.totalTime,
        instructions: routes[0].instructions
      });
    });

    return () => {
      try {
        if (map && routingControl) {
          const plan = routingControl.getPlan();
          if (plan) {
            plan.setWaypoints([]);
          }
          map.removeControl(routingControl);
        }
      } catch (e) {
        console.error("Error cleaning up routing control:", e);
      }
    };
  }, [map, startLat, startLng, endLat, endLng, onRouteFound, transportMode]);

  return null;
}

function MapControls({ 
  center, 
  onRouteClick,
  isRouting
}: { 
  center: [number, number];
  onRouteClick: () => void;
  isRouting: boolean;
}) {
  const map = useMap();

  return (
    <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-3">
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          map.flyTo(center, 14);
        }}
        className="bg-black/60 backdrop-blur-xl border border-white/10 p-3.5 rounded-full text-white hover:bg-white/20 hover:scale-110 transition-all shadow-2xl cursor-pointer flex items-center justify-center group"
        title="My Location"
      >
        <Navigation className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
      </button>
      {!isRouting && (
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRouteClick();
          }}
          className="bg-black/60 backdrop-blur-xl border border-white/10 p-3.5 rounded-full text-white hover:bg-white/20 hover:scale-110 transition-all shadow-2xl cursor-pointer flex items-center justify-center group"
          title="Draw Route to Selected User"
        >
          <RouteIcon className="w-5 h-5 group-hover:text-white transition-colors" />
        </button>
      )}
    </div>
  );
}

export default function MapView() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [selectedTarget, setSelectedTarget] = useState<[number, number] | null>(null);
  const [routeTarget, setRouteTarget] = useState<[number, number] | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [transportMode, setTransportMode] = useState<TransportMode>('driving');

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'users'), where('uid', '!=', user.uid));
        const querySnapshot = await getDocs(q);
        const fetchedUsers: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as UserProfile;
          if (data.location) {
            fetchedUsers.push(data);
          }
        });
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching map users:", error);
      }
    };

    fetchUsers();
  }, [user]);

  const defaultCenter: [number, number] = profile?.location 
    ? [profile.location.lat, profile.location.lng] 
    : [37.7749, -122.4194]; // Default to SF

  const handleRouteClick = () => {
    if (routeTarget) {
      // Clear route
      setRouteTarget(null);
      setRouteInfo(null);
      return;
    }
    
    if (!selectedTarget) {
      alert("Please select a user on the map first to draw a route to them!");
      return;
    }

    if (!profile?.location) {
      alert("Your location is not set. Please update your profile with your location to use routing.");
      return;
    }

    setRouteInfo(null); // Clear previous info before showing new route
    setCurrentInstructionIndex(0);
    setRouteTarget(selectedTarget);
  };

  const handleRouteFound = useCallback((info: RouteInfo) => {
    setRouteInfo(info);
    setCurrentInstructionIndex(0);
  }, []);

  return (
    <div className="h-[calc(100vh-12rem)] w-full rounded-[2.5rem] overflow-hidden border border-white/10 relative z-10">
      <MapContainer center={defaultCenter} zoom={13} scrollWheelZoom={true} className="h-full w-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <MapControls 
          center={defaultCenter} 
          onRouteClick={handleRouteClick}
          isRouting={routeTarget !== null}
        />

        {routeTarget && profile?.location && (
          <RoutingControl 
            start={[profile.location.lat, profile.location.lng]} 
            end={routeTarget} 
            onRouteFound={handleRouteFound}
            transportMode={transportMode}
          />
        )}

        {/* Current User Marker */}
        {profile?.location && (
          <Marker position={[profile.location.lat, profile.location.lng]}>
            <Popup className="custom-popup">
              <div className="text-black p-2">
                <h3 className="font-bold text-lg">You</h3>
                <p className="text-sm">Here you are!</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Other Users Markers */}
        {users.map((u) => (
          <Marker 
            key={u.uid} 
            position={[u.location!.lat, u.location!.lng]}
            eventHandlers={{
              click: () => {
                setSelectedTarget([u.location!.lat, u.location!.lng]);
                setSelectedUser(u);
                if (routeTarget) {
                  setRouteTarget([u.location!.lat, u.location!.lng]);
                  setRouteInfo(null);
                }
              }
            }}
          >
            <Popup className="custom-popup" onClose={() => {
              if (!routeTarget) {
                setSelectedTarget(null);
                setSelectedUser(null);
              }
            }}>
              <div className="text-black p-2">
                <h3 className="font-bold text-lg mb-1">{u.name}</h3>
                <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 mb-2">
                  Has: {u.skillHave}
                </p>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => navigate(`/chat/${u.uid}`)}
                    className="bg-black text-white px-4 py-2 rounded-full text-xs font-medium hover:bg-gray-800 transition-colors cursor-pointer w-full"
                  >
                    Message
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Route Info Card */}
      <AnimatePresence>
        {routeTarget && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 z-[1001] bg-[#1a1a1a] border-t border-white/10 p-6 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col"
          >
            <div className="flex justify-between items-start mb-4 shrink-0">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">Route Info</h3>
                <p className="text-gray-400 text-sm">To {selectedUser?.name || 'Destination'}</p>
              </div>
              <button
                onClick={handleRouteClick}
                className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="flex gap-4 mb-4 shrink-0">
              <div className="flex-1 bg-black/50 rounded-2xl p-4 border border-white/5">
                <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Distance</div>
                <div className="text-xl font-semibold text-white">
                  {!routeInfo ? (
                    <span className="animate-pulse text-white/50 text-base">Calculating...</span>
                  ) : routeInfo.distance < 1000 
                    ? `${Math.round(routeInfo.distance)} m` 
                    : `${(routeInfo.distance / 1000).toFixed(1)} km`}
                </div>
              </div>
              <div className="flex-1 bg-black/50 rounded-2xl p-4 border border-white/5 relative">
                <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Est. Time</div>
                <div className="text-xl font-semibold text-white">
                  {!routeInfo ? (
                    <span className="animate-pulse text-white/50 text-base">Calculating...</span>
                  ) : routeInfo.time < 60 
                    ? `${Math.round(routeInfo.time)} sec` 
                    : routeInfo.time < 3600 
                      ? `${Math.round(routeInfo.time / 60)} min` 
                      : `${Math.floor(routeInfo.time / 3600)} hr ${Math.round((routeInfo.time % 3600) / 60)} min`}
                </div>
                <button 
                  onClick={() => {
                    setTransportMode(prev => prev === 'driving' ? 'cycling' : prev === 'cycling' ? 'walking' : 'driving');
                  }}
                  className="absolute top-3 right-3 flex items-center gap-1 p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Change transport mode"
                >
                  {transportMode === 'driving' && <Car className="w-4 h-4 text-gray-400" />}
                  {transportMode === 'cycling' && <Bike className="w-4 h-4 text-gray-400" />}
                  {transportMode === 'walking' && <Footprints className="w-4 h-4 text-gray-400" />}
                  <ChevronRight className="w-3 h-3 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Next Instruction */}
            {routeInfo && routeInfo.instructions && routeInfo.instructions.length > currentInstructionIndex && (
              <div className="bg-white/5 p-4 rounded-2xl flex flex-col border border-white/5 shrink-0">
                <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Next Step</div>
                <div className="flex items-center justify-between">
                  <span className="text-lg text-white font-medium">{routeInfo.instructions[currentInstructionIndex].text || 'Continue straight'}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-blue-400 whitespace-nowrap bg-blue-500/10 px-3 py-1 rounded-lg">
                      {routeInfo.instructions[currentInstructionIndex].distance < 1000 ? `${Math.round(routeInfo.instructions[currentInstructionIndex].distance)}m` : `${(routeInfo.instructions[currentInstructionIndex].distance / 1000).toFixed(1)}km`}
                    </span>
                    {currentInstructionIndex < routeInfo.instructions.length - 1 && (
                      <button 
                        onClick={() => setCurrentInstructionIndex(prev => prev + 1)}
                        className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
