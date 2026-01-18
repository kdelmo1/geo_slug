import React, { useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, StreetViewPanorama, Marker, Polyline, Polygon } from '@react-google-maps/api';

// === CONFIGURATION ===

const STATIC_CHALLENGES = [
  { id: 'static_1', type: 'IMAGE', url: '/locations/merrill_market.jpeg', lat: 37.00015, lng: -122.0537 },
];

const UCSC_POLYGON_PATH = [
  { lat: 36.977234, lng: -122.053746 },
  { lat: 36.984544, lng: -122.047447 },
  { lat: 37.003000, lng: -122.050000 },
  { lat: 37.001932, lng: -122.067281 },
  { lat: 36.991330, lng: -122.069093 },
  { lat: 36.987820, lng: -122.069142 },
  { lat: 36.983775, lng: -122.065923 },
  { lat: 36.979755, lng: -122.059507 },
  { lat: 36.977064, lng: -122.055945 },
  { lat: 36.977234, lng: -122.053746 }
];

const GENERATOR_BOUNDS = {
  north: 37.0050,
  south: 36.9750,
  east: -122.0450,
  west: -122.0720
};

const VIEW_BOUNDS = {
  north: 37.0500,
  south: 36.9500,
  east: -122.0000,
  west: -122.1000
};

const UCSC_CENTER = { lat: 36.9915, lng: -122.0583 };

// === NEW STYLES ===
// 1. The Street View Window (Left Side)
const streetViewContainerStyle = { 
  width: '100%', 
  height: '100%', 
  borderRadius: '12px', // Rounded corners for the "window" look
  overflow: 'hidden',
  boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
};

// 2. The Guessing Map (Right Side - Portrait)
const guessingMapStyle = { 
  width: '100%', 
  height: '100%', 
  borderRadius: '12px'
};

type ChallengeMode = 'STREET_VIEW' | 'IMAGE';

interface CurrentChallenge {
  mode: ChallengeMode;
  lat: number;
  lng: number;
  url?: string;
}

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const App: React.FC = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY, 
    libraries: ['geometry']
  });

  const [currentChallenge, setCurrentChallenge] = useState<CurrentChallenge | null>(null);
  const [guess, setGuess] = useState<google.maps.LatLngLiteral | null>(null);
  const [gameMode, setGameMode] = useState<'GUESSING' | 'RESULT'>('GUESSING');
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isLoaded && !currentChallenge) {
      startNewRound();
    }
  }, [isLoaded]);

  const startNewRound = () => {
    setLoading(true);
    setGuess(null);
    setDistance(null);
    setGameMode('GUESSING');

    const useStaticImage = Math.random() > 0.5;

    if (useStaticImage && STATIC_CHALLENGES.length > 0) {
      const randomStatic = STATIC_CHALLENGES[Math.floor(Math.random() * STATIC_CHALLENGES.length)];
      setCurrentChallenge({
        mode: 'IMAGE',
        lat: randomStatic.lat,
        lng: randomStatic.lng,
        url: randomStatic.url
      });
      setLoading(false);
    } else {
      findStreetViewLocation();
    }
  };

  const findStreetViewLocation = (retryCount = 0) => {
    if (retryCount > 50) {
      setLoading(false);
      alert("Could not find a valid spot inside your shape.");
      return;
    }

    const polygon = new google.maps.Polygon({ paths: UCSC_POLYGON_PATH });
    const randomLat = GENERATOR_BOUNDS.south + Math.random() * (GENERATOR_BOUNDS.north - GENERATOR_BOUNDS.south);
    const randomLng = GENERATOR_BOUNDS.west + Math.random() * (GENERATOR_BOUNDS.east - GENERATOR_BOUNDS.west);
    const randomPoint = new google.maps.LatLng(randomLat, randomLng);

    if (!google.maps.geometry.poly.containsLocation(randomPoint, polygon)) {
      findStreetViewLocation(retryCount + 1);
      return;
    }

    const sv = new google.maps.StreetViewService();
    sv.getPanorama({ 
      location: randomPoint, 
      radius: 50, 
      source: google.maps.StreetViewSource.GOOGLE, // Safe Mode (Keep enabled for now)
      // preference: google.maps.StreetViewPreference.NEAREST 
    }, (data, status) => {
      if (status === 'OK' && data?.location?.latLng) {
        if (google.maps.geometry.poly.containsLocation(data.location.latLng, polygon)) {
           setCurrentChallenge({
            mode: 'STREET_VIEW',
            lat: data.location.latLng.lat(),
            lng: data.location.latLng.lng()
          });
          setLoading(false);
        } else {
           findStreetViewLocation(retryCount + 1);
        }
      } else {
        setTimeout(() => findStreetViewLocation(retryCount + 1), 50); 
      }
    });
  };

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (gameMode === 'GUESSING' && e.latLng) {
      setGuess({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    }
  }, [gameMode]);

  const handleGuess = () => {
    if (guess && currentChallenge) {
      const dist = calculateDistance(currentChallenge.lat, currentChallenge.lng, guess.lat, guess.lng);
      setDistance(dist);
      setGameMode('RESULT');
    }
  };

  if (!isLoaded) return <div>Loading...</div>;

  return (
    // <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#1a1a1a' }}>
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fccf04' }}>
      
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px'
        }}>
          Setting up next round...
        </div>
      )}

      {/* === GUESSING LAYOUT (Split Screen) === */}
      {gameMode === 'GUESSING' && currentChallenge && (
        <div style={{ display: 'flex', width: '100%', height: '100%', padding: '20px', boxSizing: 'border-box', gap: '20px' }}>
          
          {/* 1. LEFT SIDE: Street View "Window" */}
          <div style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', height: '85%', position: 'relative' }}>
              
              {currentChallenge.mode === 'STREET_VIEW' ? (
                <GoogleMap
                  mapContainerStyle={streetViewContainerStyle}
                  zoom={14}
                  center={{ lat: currentChallenge.lat, lng: currentChallenge.lng }}
                  options={{ disableDefaultUI: true }}
                >
                  <StreetViewPanorama
                    position={{ lat: currentChallenge.lat, lng: currentChallenge.lng }}
                    visible={true}
                    options={{
                      disableDefaultUI: true,
                      enableCloseButton: false,
                      showRoadLabels: false,
                      source: google.maps.StreetViewSource.GOOGLE,
                      imageDateControl: false, 
                      motionTracking: false,
                      motionTrackingControl: false
                    }}
                  />
                </GoogleMap>
              ) : (
                <div style={{ ...streetViewContainerStyle, background: 'black' }}>
                  <img 
                    src={currentChallenge.url} 
                    alt="Guess this location"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 2. RIGHT SIDE: Portrait Map & Button */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* The Map */}
            <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
              <GoogleMap
                mapContainerStyle={guessingMapStyle}
                center={UCSC_CENTER}
                zoom={13.5}
                onClick={onMapClick}
                options={{
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false,
                  zoomControl: true,
                  gestureHandling: 'greedy',
                  restriction: { latLngBounds: VIEW_BOUNDS, strictBounds: false }
                }}
              >
                {guess && <Marker position={guess} />}
                <Polygon
                  paths={UCSC_POLYGON_PATH}
                  options={{
                    strokeColor: "#FF0000",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: "#FF0000",
                    fillOpacity: 0.05,
                    clickable: false
                  }}
                />
              </GoogleMap>
            </div>

            {/* The Button */}
            <button 
              onClick={handleGuess}
              disabled={!guess}
              style={{
                width: '100%', 
                padding: '20px', 
                background: guess ? '#4CAF50' : '#555', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: guess ? 'pointer' : 'not-allowed', 
                fontSize: '18px',
                fontWeight: 'bold',
                transition: 'background 0.3s'
              }}
            >
              {guess ? "MAKE GUESS" : "Place a marker on the map"}
            </button>
          </div>

        </div>
      )}

      {/* === RESULT MODE (Full Screen Overlay) === */}
      {gameMode === 'RESULT' && guess && currentChallenge && (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={UCSC_CENTER}
                zoom={14}
                options={{ streetViewControl: false, mapTypeControl: false }}
            >
                <Marker position={{ lat: currentChallenge.lat, lng: currentChallenge.lng }} label="Goal" />
                <Marker position={guess} label="You" />
                <Polyline path={[{ lat: currentChallenge.lat, lng: currentChallenge.lng }, guess]} options={{ strokeColor: "#FF0000", strokeOpacity: 1.0, strokeWeight: 2 }} />
            </GoogleMap>
            
            <div style={{ 
              position: 'absolute', top: '50px', left: '50%', transform: 'translateX(-50%)', 
              backgroundColor: 'white', padding: '30px', borderRadius: '15px', textAlign: 'center', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 20
            }}>
                <h1 style={{ margin: '0 0 15px 0', color: '#333'}}>Round Over!</h1>
                <p style={{ fontSize: '20px', color: '#555', marginBottom: '20px' }}>
                  You were <strong>{distance?.toFixed(3)} km</strong> away.
                </p>
                <button 
                  onClick={startNewRound} 
                  style={{ 
                    padding: '12px 30px', background: '#2196F3', color: 'white', 
                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' 
                  }}
                >
                  Play Next Round
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;