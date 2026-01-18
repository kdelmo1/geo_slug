import React, { useState, useCallback, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  StreetViewPanorama,
  Marker,
  Polyline,
} from "@react-google-maps/api";
import { supabase } from "../lib/supabaseClient";

// === CONFIGURATION ===

const TOTAL_ROUNDS = 5;
const SCORING_SCALE = 2000;

// Interfaces
interface SupabaseLocation {
  id: number;
  name: string;
  latitude: string | number;
  longitude: string | number;
  image_url: string;
  fun_fact?: string;
}

interface CurrentChallenge {
  mode: "STREET_VIEW" | "IMAGE";
  lat: number;
  lng: number;
  url?: string;
  name?: string;
  funFact?: string;
}

// Polygon & Bounds
const UCSC_POLYGON_PATH = [
  { lat: 36.977234, lng: -122.053746 },
  { lat: 36.984544, lng: -122.047447 },
  { lat: 37.003, lng: -122.05 },
  { lat: 37.001932, lng: -122.067281 },
  { lat: 36.99133, lng: -122.069093 },
  { lat: 36.98782, lng: -122.069142 },
  { lat: 36.983775, lng: -122.065923 },
  { lat: 36.979755, lng: -122.059507 },
  { lat: 36.977064, lng: -122.055945 },
  { lat: 36.977234, lng: -122.053746 },
];

const GENERATOR_BOUNDS = {
  north: 37.005,
  south: 36.975,
  east: -122.045,
  west: -122.072,
};

const VIEW_BOUNDS = {
  north: 37.05,
  south: 36.95,
  east: -122.0,
  west: -122.1,
};

const UCSC_CENTER = { lat: 36.9915, lng: -122.0583 };

const streetViewContainerStyle = {
  width: "100%",
  height: "100%",
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
};
const guessingMapStyle = {
  width: "100%",
  height: "100%",
  borderRadius: "12px",
};

const calculateDistanceMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// === DRAGGABLE WINDOW COMPONENT ===
const DraggableResult = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setPosition({
      x: window.innerWidth / 2 - 700,
      y: window.innerHeight / 2 - 150,
    });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    },
    [isDragging, dragOffset],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = dimensions.width;
    const startHeight = dimensions.height;

    const onResizeMove = (moveEvent: MouseEvent) => {
      setDimensions({
        width: Math.max(300, startWidth + (moveEvent.clientX - startX)),
        height: Math.max(200, startHeight + (moveEvent.clientY - startY)),
      });
    };

    const onResizeUp = () => {
      window.removeEventListener("mousemove", onResizeMove);
      window.removeEventListener("mouseup", onResizeUp);
    };

    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", onResizeUp);
  };

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        onMouseDown={handleMouseDown}
        className={isDragging ? "grabbing-cursor" : "grab-cursor"}
        style={{
          padding: "10px",
          background: "#f1f1f1",
          borderBottom: "1px solid #ddd",
          userSelect: "none",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
          <span
            className="move-cursor"
            style={{
              display: "inline-block",
              width: "32px",
              height: "32px",
              background: "url(/cursors/four.png) center/contain no-repeat",
              opacity: 0.6,
            }}
          ></span>
      </div>

      <div style={{ padding: "20px", overflowY: "auto", flex: 1, textAlign: 'center' }}>
        {children}
      </div>

      <div
        onMouseDown={handleResizeMouseDown}
        className="resize-cursor"
        title="Resize"
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: "30px",
          height: "30px",
          zIndex: 20,
          background: "linear-gradient(135deg, transparent 50%, #ddd 50%)",
          borderBottomRightRadius: "12px",
        }}
      />
    </div>
  );
};

interface GameProps {
  onExit: () => void;
}

const Game: React.FC<GameProps> = ({ onExit }) => {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["geometry"],
  });

  const [currentChallenge, setCurrentChallenge] =
    useState<CurrentChallenge | null>(null);
  const [guess, setGuess] = useState<google.maps.LatLngLiteral | null>(null);
  const [gameMode, setGameMode] = useState<"GUESSING" | "RESULT" | "GAME_OVER">(
    "GUESSING",
  );
  const [loading, setLoading] = useState(false);

  // Scores
  const [round, setRound] = useState(1);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [roundScore, setRoundScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [roundHistory, setRoundHistory] = useState<number[]>([]);

  // Supabase
  const [supabaseLocations, setSupabaseLocations] = useState<
    SupabaseLocation[]
  >([]);
  const [isFetchingLocations, setIsFetchingLocations] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from("locations")
          .select("*")
          .not("image_url", "is", null);

        if (error) throw error;
        if (data) setSupabaseLocations(data as SupabaseLocation[]);
      } catch (error) {
        console.error("Error fetching locations:", error);
      } finally {
        setIsFetchingLocations(false);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    if (isLoaded && !isFetchingLocations && !currentChallenge) {
      startRound();
    }
  }, [isLoaded, isFetchingLocations]);

  const startRound = () => {
    setLoading(true);
    setGuess(null);
    setDistanceMeters(null);
    setGameMode("GUESSING");

    const useStaticImage = Math.random() > 0.4;

    if (useStaticImage && supabaseLocations.length > 0) {
      const randomIndex = Math.floor(Math.random() * supabaseLocations.length);
      const locationData = supabaseLocations[randomIndex];

      setCurrentChallenge({
        mode: "IMAGE",
        lat: Number(locationData.latitude),
        lng: Number(locationData.longitude),
        url: locationData.image_url,
        name: locationData.name,
        funFact: locationData.fun_fact,
      });
      setLoading(false);
    } else {
      findStreetViewLocation();
    }
  };

  const handleNextRound = async () => {
    if (round < TOTAL_ROUNDS) {
      setRound((r) => r + 1);
      startRound();
    } else {
      await saveScore();
      setGameMode("GAME_OVER");
    }
  };

  const saveScore = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!existingUser) {
        const { error: userError } = await supabase.from("users").insert({
          id: user.id,
          student_email: user.email || "",
          name:
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Anonymous",
        });
        if (userError) console.error("Error creating user:", userError);
      }

      const { error: scoreError } = await supabase.from("scores").insert({
        user_id: user.id,
        score: totalScore, 
      });

      if (scoreError) console.error("Error saving score:", scoreError);
    } catch (error) {
      console.error("Error in saveScore:", error);
    }
  };

  const findStreetViewLocation = (retryCount = 0) => {
    if (retryCount > 50) {
      setLoading(false);
      alert("Could not find a valid spot inside your shape.");
      return;
    }

    const polygon = new google.maps.Polygon({ paths: UCSC_POLYGON_PATH });
    const randomLat =
      GENERATOR_BOUNDS.south +
      Math.random() * (GENERATOR_BOUNDS.north - GENERATOR_BOUNDS.south);
    const randomLng =
      GENERATOR_BOUNDS.west +
      Math.random() * (GENERATOR_BOUNDS.east - GENERATOR_BOUNDS.west);
    const randomPoint = new google.maps.LatLng(randomLat, randomLng);

    if (!google.maps.geometry.poly.containsLocation(randomPoint, polygon)) {
      findStreetViewLocation(retryCount + 1);
      return;
    }

    const sv = new google.maps.StreetViewService();
    sv.getPanorama(
      {
        location: randomPoint,
        radius: 50,
      },
      (data, status) => {
        if (status === "OK" && data?.location?.latLng) {
          if (
            google.maps.geometry.poly.containsLocation(
              data.location.latLng,
              polygon,
            )
          ) {
            setCurrentChallenge({
              mode: "STREET_VIEW",
              lat: data.location.latLng.lat(),
              lng: data.location.latLng.lng(),
            });
            setLoading(false);
          } else {
            findStreetViewLocation(retryCount + 1);
          }
        } else {
          setTimeout(() => findStreetViewLocation(retryCount + 1), 50);
        }
      },
    );
  };

  const onMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (gameMode === "GUESSING" && e.latLng) {
        setGuess({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      }
    },
    [gameMode],
  );

  const handleGuess = () => {
    if (guess && currentChallenge) {
      const dist = calculateDistanceMeters(
        currentChallenge.lat,
        currentChallenge.lng,
        guess.lat,
        guess.lng,
      );
      setDistanceMeters(dist);

      const calculatedScore = Math.round(
        5000 * Math.exp(-dist / SCORING_SCALE),
      );

      setRoundScore(calculatedScore);
      setTotalScore((prev) => prev + calculatedScore);
      setRoundHistory((prev) => [...prev, calculatedScore]);
      setGameMode("RESULT");
    }
  };

  if (!isLoaded || isFetchingLocations)
    return <div style={{ color: "black", padding: 20 }}></div>;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "transparent",
      }}
    >
      
      {/* === HUD (Pill Shape, Tucked Behind) === */}
      {gameMode !== "GAME_OVER" && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "30px",
            // Always use 0 to tuck behind windows (Window Z is 10)
            zIndex: 0, 
            
            // PILL SHAPE STYLING
            backgroundColor: "white",
            borderRadius: "20px",  
            boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
            
            // Layout
            display: "flex",
            alignItems: "center",
            paddingBottom: "35px", 
            overflow: "hidden", 
            
            fontFamily: 'miamiwriting, sans-serif',
            color: "#333",
          }}
        >
          {/* LEFT SIDE: ROUND */}
          <div style={{
            padding: "5px 25px 15px 25px", 
            fontSize: "24px",
            fontWeight: "bold",
          }}>
             Round {round} / {TOTAL_ROUNDS}
          </div>

          {/* DIVIDER LINE */}
          <div style={{
             width: "2px",
             height: "30px",
             backgroundColor: "#ddd",
             boxShadow: "1px 0 2px rgba(0,0,0,0.1) inset"
          }}></div>

          {/* RIGHT SIDE: SCORE */}
          <div style={{
             padding: "5px 25px 15px 25px", 
             fontSize: "24px",
             fontWeight: "bold",
             color: "#555",
          }}>
             Total: {totalScore}
          </div>

        </div>
      )}

      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "24px",
          }}
        >
          Setting up Round {round}...
        </div>
      )}

      {/* GUESSING SCREEN */}
      {gameMode === "GUESSING" && currentChallenge && (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            padding: "65px 20px 20px 20px", 
            boxSizing: "border-box",
            gap: "20px",
          }}
        >
          {/* Left: Street View (Z-Index High to cover bottom of pill) */}
          <div
            style={{
              flex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              zIndex: 10, // <--- COVERS THE HUD
            }}
          >
            {/* BORDER IMAGE CONTAINER */}
            <div
              style={{ 
                width: "100%", 
                height: "100%", 
                position: "relative",
                borderRadius: "12px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                background: 'white'
              }}
            >
              {currentChallenge.mode === "STREET_VIEW" ? (
                <GoogleMap
                  mapContainerStyle={streetViewContainerStyle}
                  zoom={14}
                  center={{
                    lat: currentChallenge.lat,
                    lng: currentChallenge.lng,
                  }}
                  options={{ disableDefaultUI: true }}
                >
                    <StreetViewPanorama
                        visible={true}
                        options={{
                            position: {
                                lat: currentChallenge.lat,
                                lng: currentChallenge.lng
                            },
                            disableDefaultUI: true,
                            enableCloseButton: false,
                            showRoadLabels: false,
                            imageDateControl: false,
                            motionTracking: false,
                            motionTrackingControl: false,
                            panControl: true,
                            zoomControl: true,
                        }}
                    />
                </GoogleMap>
              ) : (
                <div
                  style={{ ...streetViewContainerStyle, background: "black" }}
                >
                  <img
                    src={currentChallenge.url}
                    alt="Location"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center",
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right: Map & Guess Button */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              zIndex: 10, // Keep this high too
            }}
          >
            <div
              style={{
                flex: 1,
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
              }}
            >
              <GoogleMap
                mapContainerStyle={guessingMapStyle}
                center={UCSC_CENTER}
                zoom={14.5} 
                onClick={onMapClick}
                options={{
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false,
                  zoomControl: true,
                  gestureHandling: "greedy",
                  restriction: {
                    latLngBounds: VIEW_BOUNDS,
                    strictBounds: false,
                  },
                  clickableIcons: false,
                  draggableCursor: "url(/cursors/arrow.png) 6 5, grab",
                  draggingCursor: "url(/cursors/closed-hand.png) 32 32, grabbing",
                }}
              >
                {guess && (
                    <Marker
                        position={guess}
                        clickable={false}
                        label={{
                            text: "●",
                            color: "black",
                            fontSize: "14px",
                        }}
                        icon={{
                            path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
                            fillColor: "#EA4335",   // Red Fill
                            fillOpacity: 1,
                            strokeColor: "#FFFFFF", // White Stroke
                            strokeWeight: 3,
                            scale: 2,
                            anchor: new google.maps.Point(12, 22),
                            labelOrigin: new google.maps.Point(12, 9),
                        }}
                    />
                )}
              </GoogleMap>
            </div>
            
            <button
              className="guess-button-wrapper"
              onClick={handleGuess}
              disabled={!guess}
            >
              <img
                src="/guess_button.png"
                alt="Guess"
                className="guess-btn-img"
              />
              <div className="guess-btn-glow" />
              <span className="guess-btn-text">GUESS</span>
            </button>
          </div>
        </div>
      )}

      {/* RESULT MODE (Draggable Window) */}
      {gameMode === "RESULT" && guess && currentChallenge && (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
          
          {/* Full Screen Map Background -> NOW WRAPPED AND PADDED to Reveal Background & Tab */}
          <div style={{
            position: "absolute",
            top: "65px",  // Matched to Guessing Screen padding (leaves room for HUD tab)
            bottom: "20px",
            left: "20px",
            right: "20px",
            borderRadius: "12px", // Matched to Guessing Screen
            zIndex: 10, // COVERS THE HUD
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
          }}>
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={UCSC_CENTER}
              zoom={14}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
                draggableCursor: "url(/cursors/arrow.png) 6 5, grab",
                draggingCursor: "url(/cursors/closed-hand.png) 32 32, grabbing",
              }}
            >
            <Marker
                position={{
                    lat: currentChallenge.lat,
                    lng: currentChallenge.lng,
                }}
                // 1. ADD THE LABEL PROP HERE
                label={{
                    text: "●",          // Unicode black circle
                    color: "black",     // Color of the dot
                    fontSize: "14px",   // Size of the dot
                }}
                icon={{
                    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
                    fillColor: "#FFD700",
                    fillOpacity: 1,
                    strokeColor: "#FFFFFF",
                    strokeWeight: 3,
                    scale: 2,
                    anchor: new google.maps.Point(12, 22),
                    // 2. ADD THIS LINE TO CENTER THE DOT
                    labelOrigin: new google.maps.Point(12, 9),
                }}
            />

            <Marker
                position={guess}
                // 1. ADD THE LABEL PROP HERE
                label={{
                    text: "●",
                    color: "black", // You can change this to "white" if you prefer
                    fontSize: "14px",
                }}
                icon={{
                    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
                    fillColor: "#EA4335",
                    fillOpacity: 1,
                    strokeColor: "#FFFFFF",
                    strokeWeight: 3,
                    scale: 2,
                    anchor: new google.maps.Point(12, 22),
                    // 2. ADD THIS LINE TO CENTER THE DOT
                    labelOrigin: new google.maps.Point(12, 9),
                }}
            />
              <Polyline
                path={[
                  { lat: currentChallenge.lat, lng: currentChallenge.lng },
                  guess,
                ]}
                options={{
                  strokeColor: "#FF0000",
                  strokeOpacity: 1.0,
                  strokeWeight: 2,
                }}
              />
            </GoogleMap>
            {/* === NEW CONTROLS OVERLAY (Overlayed on Map) === */}
            <div style={{
              position: 'absolute',
              bottom: '25px', 
              left: '0',
              right: '0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              padding: '0 40px',
              zIndex: 30, // Above Map
              pointerEvents: 'none', // Let clicks pass through empty space
              fontFamily: 'miamiwriting, sans-serif'
            }}>
                {/* Left: Distance */}
                <div style={{ 
                  pointerEvents: 'auto',
                  backgroundColor: 'white',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '14px', color: '#888', textTransform: 'uppercase' }}>Distance</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#555' }}>
                    {distanceMeters?.toFixed(0)}m
                  </div>
                </div>

                {/* Center: Next Button */}
                <div style={{ pointerEvents: 'auto' }}>
                  {/* --- REPLACED BUTTON --- */}
                  <button
                    className="next-button-wrapper"
                    onClick={handleNextRound}
                  >
                    {/* Ensure you have next_button.png in your public folder */}
                    <img src="/next_button.png" alt="Next" className="next-btn-img" />
                    <div className="next-btn-glow" />
                    <span className="next-btn-text">
                      {round < TOTAL_ROUNDS ? "NEXT ROUND" : "FINISH GAME"}
                    </span>
                  </button>
                  {/* ----------------------- */}
                </div>

                {/* Right: Round Score */}
                <div style={{ 
                  pointerEvents: 'auto',
                  backgroundColor: 'white',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                  textAlign: 'center'
                }}>
                   <div style={{ fontSize: '14px', color: '#888', textTransform: 'uppercase' }}>Round Score</div>
                   <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4CAF50' }}>
                     {roundScore} pts
                   </div>
                </div>
            </div>
          </div>
        {/* Draggable Window (ONLY IF NAME EXISTS) */}
          {currentChallenge.name ? (
            <DraggableResult>
              {/* Bold Title */}
              <h1 style={{ 
                fontFamily: 'miamiwriting, sans-serif', 
                fontSize: "36px", 
                margin: "5px 0", 
                color: "#333",
                fontWeight: 'bold'
              }}>
                {currentChallenge.name}
              </h1>

              {/* Fun Fact */}
              {currentChallenge.funFact && (
                <div
                  style={{
                    backgroundColor: "#f9f9f9",
                    padding: "15px",
                    borderRadius: "8px",
                    borderLeft: "4px solid #fccf04",
                    textAlign: "left",
                    marginTop: "15px",
                    fontStyle: "italic",
                    color: "#444",
                  }}
                >
                  <strong>Did you know?</strong>
                  <br />
                  {currentChallenge.funFact}
                </div>
              )}
            </DraggableResult>
          ) : null}
        </div>
      )}

      {/* GAME OVER SCREEN */}
      {gameMode === "GAME_OVER" && (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "20px",
              textAlign: "center",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
              width: "90%",
              maxWidth: "400px",
            }}
          >
            <h1
              style={{ fontSize: "52px", color: "#333", marginBottom: "10px", fontFamily: 'miamiwriting, sans-serif' }}
            >
              Game Over!
            </h1>

            <div style={{ margin: "20px 0" }}>
              <div
                style={{
                  fontSize: "32px",
                  textTransform: "uppercase",
                  color: "#888",
                  letterSpacing: "1px",
                  fontFamily: 'miamiwriting, sans-serif'
                }}
              >
                Final Score
              </div>
              <div
                style={{
                  fontSize: "64px",
                  fontWeight: "bold",
                  color: "#4CAF50",
                  fontFamily: 'miamiwriting, sans-serif'
                }}
              >
                {totalScore}{" "}
                <span style={{ fontSize: "24px", color: "#666" }}>/ 25000</span>
              </div>
            </div>

            <div
              style={{
                marginBottom: "20px",
                borderTop: "1px solid #eee",
                borderBottom: "1px solid #eee",
                padding: "10px 0",
              }}
            >
              {roundHistory.map((score, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: index < 4 ? "1px dashed #eee" : "none",
                  }}
                >
                  <span style={{ color: "#555", fontWeight: "bold", fontSize: '20px', fontFamily: 'miamiwriting, sans-serif' }}>
                    Round {index + 1}
                  </span>
                  <span style={{ color: "#666", fontSize: '20px', fontFamily: 'miamiwriting, sans-serif'}}>{score} pts</span>
                </div>
              ))}
            </div>

            {/* RETURN HOME BUTTON - Image Placeholder */}
            <button
                onClick={onExit}
                className="next-button-wrapper"
                style={{
                  width: '100%',
                  minWidth: '280px',
                  height: '80px'
                }}
            >
                <img src="/home_button.png" alt="Return Home" className="next-btn-img" />
                <div className="home-btn-glow" />
                <span className="next-btn-text">RETURN HOME</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;