import React, { useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, StreetViewPanorama, Marker, Polyline } from '@react-google-maps/api';

// === CONFIGURATION ===

// 1. Define your UCSC Static Images here
// Put these images in your "public/locations/" folder
const STATIC_CHALLENGES = [
  { id: 'static_1', type: 'IMAGE', url: '/locations/merrill_market.jpeg', lat: 37.00015, lng: -122.0537 },
];

const UCSC_BOUNDS = {
  north: 37.002191,
  south: 36.976541,
  east: -122.048064,
  west: -122.07160
};
const UCSC_CENTER = { lat: 36.9915, lng: -122.0583 };

const containerStyle = { width: '100%', height: '100vh' };
const smallMapStyle = { width: '400px', height: '300px' };

// === TYPES ===
type ChallengeMode = 'STREET_VIEW' | 'IMAGE';

interface CurrentChallenge {
  mode: ChallengeMode;
  lat: number;
  lng: number;
  url?: string; // Only for images
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
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY, // <--- CHECK THIS
    libraries: ['geometry']
  });

  // State now tracks the full "Challenge Object" instead of just target lat/lng
  const [currentChallenge, setCurrentChallenge] = useState<CurrentChallenge | null>(null);
  const [guess, setGuess] = useState<google.maps.LatLngLiteral | null>(null);
  const [gameMode, setGameMode] = useState<'GUESSING' | 'RESULT'>('GUESSING');
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-start
  React.useEffect(() => {
    if (isLoaded && !currentChallenge) {
      startNewRound();
    }
  }, [isLoaded]);

  // === THE NEW SELECTION LOGIC ===
  const startNewRound = () => {
    setLoading(true);
    setGuess(null);
    setDistance(null);
    setGameMode('GUESSING');

    // 50% Chance: Static Image OR Street View
    // You can adjust this (e.g., Math.random() > 0.7 for mostly Street View)
    const useStaticImage = Math.random() > 0.5;

    if (useStaticImage && STATIC_CHALLENGES.length > 0) {
      // PICK A STATIC IMAGE
      const randomStatic = STATIC_CHALLENGES[Math.floor(Math.random() * STATIC_CHALLENGES.length)];
      setCurrentChallenge({
        mode: 'IMAGE',
        lat: randomStatic.lat,
        lng: randomStatic.lng,
        url: randomStatic.url
      });
      setLoading(false);
    } else {
      // PICK STREET VIEW
      findStreetViewLocation();
    }
  };

  const findStreetViewLocation = (retryCount = 0) => {
    if (retryCount > 20) {
      setLoading(false);
      alert("Could not find a Street View spot.");
      return;
    }

    const sv = new google.maps.StreetViewService();
    const randomLat = UCSC_BOUNDS.south + Math.random() * (UCSC_BOUNDS.north - UCSC_BOUNDS.south);
    const randomLng = UCSC_BOUNDS.west + Math.random() * (UCSC_BOUNDS.east - UCSC_BOUNDS.west);

    sv.getPanorama({ 
      location: { lat: randomLat, lng: randomLng }, 
      radius: 50, 
      source: google.maps.StreetViewSource.GOOGLE
    }, (data, status) => {
      if (status === 'OK' && data?.location?.latLng) {
        setCurrentChallenge({
          mode: 'STREET_VIEW',
          lat: data.location.latLng.lat(),
          lng: data.location.latLng.lng()
        });
        setLoading(false);
      } else {
        setTimeout(() => findStreetViewLocation(retryCount + 1), 100); 
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
    <div style={{ position: 'relative', height: '100vh', width: '100vw' }}>
      
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px'
        }}>
          Setting up next round...
        </div>
      )}

      {/* === GUESSING MODE === */}
      {gameMode === 'GUESSING' && currentChallenge && (
        <>
          {/* A: RENDER STREET VIEW */}
          {currentChallenge.mode === 'STREET_VIEW' ? (
            <GoogleMap
              mapContainerStyle={containerStyle}
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
            /* B: RENDER STATIC IMAGE */
            <div style={{ width: '100%', height: '100vh', background: 'black' }}>
              <img 
                src={currentChallenge.url} 
                alt="Guess this location"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} // 'contain' keeps aspect ratio, 'cover' fills screen
              />
            </div>
          )}

          {/* THE GUESSING OVERLAY (Shared by both modes) */}
          <div style={{
            position: 'absolute', bottom: '20px', right: '20px', zIndex: 10,
            backgroundColor: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <GoogleMap
              mapContainerStyle={smallMapStyle}
              center={UCSC_CENTER}
              zoom={14}
              onClick={onMapClick}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                zoomControl: true,
                gestureHandling: 'greedy',
                restriction: { latLngBounds: UCSC_BOUNDS, strictBounds: false }
              }}
            >
              {guess && <Marker position={guess} />}
            </GoogleMap>

            <button 
              onClick={handleGuess}
              disabled={!guess}
              style={{ width: '100%', marginTop: '10px', padding: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}
            >
              Make Guess
            </button>
          </div>
        </>
      )}

      {/* === RESULT MODE === */}
      {gameMode === 'RESULT' && guess && currentChallenge && (
        <div style={{ width: '100%', height: '100%' }}>
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={UCSC_CENTER}
            zoom={14}
            options={{ streetViewControl: false, mapTypeControl: false }}
          >
            {/* The Goal Marker */}
            <Marker 
              position={{ lat: currentChallenge.lat, lng: currentChallenge.lng }} 
              label="Goal" 
            />
            
            {/* Your Guess Marker */}
            <Marker position={guess} label="You" />
            
            {/* Line connecting them */}
            <Polyline
              path={[
                { lat: currentChallenge.lat, lng: currentChallenge.lng }, 
                guess
              ]}
              options={{ strokeColor: "#FF0000", strokeOpacity: 1.0, strokeWeight: 2 }}
            />
          </GoogleMap>

          <div style={{
            position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            <h1 style={{ margin: '0 0 10px 0', color: 'black'}}>Round Over!</h1>
            <p style={{ fontSize: '18px', color: 'black'}}>You were <strong>{distance?.toFixed(3)} km</strong> away.</p>
            <button 
              onClick={startNewRound}
              style={{ padding: '10px 20px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}
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