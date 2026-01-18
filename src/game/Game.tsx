import React, { useState, useCallback, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  StreetViewPanorama,
  Marker,
  Polyline,
  Polygon,
} from "@react-google-maps/api";
import { supabase } from "../lib/supabase";

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

// === UPDATED DRAGGABLE WINDOW COMPONENT ===
const DraggableResult = ({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Center initially
  useEffect(() => {
    setPosition({
      x: window.innerWidth / 2 - 200,
      y: window.innerHeight / 2 - 250,
    });
  }, []);

  // --- DRAG LOGIC ---
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag if we click the header (not the resize handle)
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

  // --- RESIZE LOGIC ---
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop the drag event from firing

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
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        // REMOVED 'resize: both' to fix the cursor fighting issue
      }}
    >
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        className={isDragging ? "grabbing-cursor" : "grab-cursor"}
        style={{
          padding: "15px",
          background: "#f1f1f1",
          borderBottom: "1px solid #ddd",
          userSelect: "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: "bold",
          color: "#333",
        }}
      >
        <span>{title}</span>
        <div
          style={{
            fontSize: "12px",
            color: "#888",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          Drag
          <span
            className="move-cursor"
            style={{
              display: "inline-block",
              width: "16px",
              height: "16px",
              background: "url(/cursors/four.png) center/contain no-repeat",
              opacity: 0.6,
            }}
          ></span>
        </div>
      </div>

      <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
        {children}
      </div>

      {/* Custom Resize Handle (Bottom-Right) */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="resize-cursor" // Uses your custom CSS class
        title="Resize"
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: "30px", // Larger hit area
          height: "30px",
          zIndex: 20,
          // We use a small gradient to make it look like a handle
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

  const restartGame = () => {
    setRound(1);
    setTotalScore(0);
    setRoundHistory([]);
    startRound();
  };

  const handleNextRound = async () => {
    if (round < TOTAL_ROUNDS) {
      setRound((r) => r + 1);
      startRound();
    } else {
      // Save score before showing game over screen
      await saveScore();
      setGameMode("GAME_OVER");
    }
  };

  const saveScore = async () => {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log("No user logged in, skipping score save");
        return;
      }

      // Check if user exists in users table, if not create them
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!existingUser) {
        // Create user record
        const { error: userError } = await supabase.from("users").insert({
          id: user.id,
          student_email: user.email || "",
          name:
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Anonymous",
        });

        if (userError) {
          console.error("Error creating user:", userError);
          return;
        }
      }

      // Save the score
      const { error: scoreError } = await supabase.from("scores").insert({
        user_id: user.id,
        score: totalScore, // Include the final round score
      });

      if (scoreError) {
        console.error("Error saving score:", scoreError);
      } else {
        console.log("Score saved successfully!");
      }
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
    return <div style={{ color: "black", padding: 20 }}>Loading...</div>;

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
      {/* HUD */}
      {gameMode !== "GAME_OVER" && (
        <div
          style={{
            position: "absolute",
            top: "15px",
            left: "20px",
            zIndex: 50,
            backgroundColor: "rgba(255,255,255,0.9)",
            padding: "10px 20px",
            borderRadius: "8px",
            fontWeight: "bold",
            fontSize: "18px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          Round {round} / {TOTAL_ROUNDS} &nbsp; | &nbsp; Total Score:{" "}
          {totalScore}
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
            padding: "60px 20px 20px 20px",
            boxSizing: "border-box",
            gap: "20px",
          }}
        >
          {/* Left: Street View */}
          <div
            style={{
              flex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{ width: "100%", height: "100%", position: "relative" }}
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
                    position={{
                      lat: currentChallenge.lat,
                      lng: currentChallenge.lng,
                    }}
                    visible={true}
                    options={{
                      disableDefaultUI: true,
                      enableCloseButton: false,
                      showRoadLabels: false,
                      source: google.maps.StreetViewSource.GOOGLE,
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
                zoom={13.5}
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

                  // === UPDATED CURSORS ===
                  // Idle: Open Hand
                  draggableCursor: "url(/cursors/hand.png) 32 32, grab",
                  // Dragging: Closed Hand
                  draggingCursor:
                    "url(/cursors/closed-hand.png) 32 32, grabbing",
                }}
              >
                {guess && <Marker position={guess} clickable={false} />}
                <Polygon
                  paths={UCSC_POLYGON_PATH}
                  options={{
                    strokeColor: "#FF0000",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: "#FF0000",
                    fillOpacity: 0.05,
                    clickable: false,
                  }}
                />
              </GoogleMap>
            </div>
            {
              <button
                className="guess-button-wrapper" // Uses the new CSS class
                onClick={handleGuess}
                disabled={!guess}
              >
                {/* 1. The Image */}
                <img
                  src="/guess_button.png"
                  alt="Guess"
                  className="guess-btn-img"
                />

                {/* 2. The Glow Overlay (Appears on hover) */}
                <div className="guess-btn-glow" />

                {/* 3. The Text (Centered using MS_PAIN font) */}
                <span className="guess-btn-text">GUESS</span>
              </button>
            }
          </div>
        </div>
      )}

      {/* RESULT MODE (Draggable Window) */}
      {gameMode === "RESULT" && guess && currentChallenge && (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
          {/* Full Screen Map Background */}
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={UCSC_CENTER}
            zoom={14}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              draggableCursor: "url(/cursors/hand.png) 32 32, grab",
              draggingCursor: "url(/cursors/closed-hand.png) 32 32, grabbing",
            }}
          >
            <Marker
              position={{
                lat: currentChallenge.lat,
                lng: currentChallenge.lng,
              }}
              label="Goal"
            />
            <Marker position={guess} label="You" />
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

          <DraggableResult
            title={
              currentChallenge.mode === "IMAGE"
                ? currentChallenge.name || "Location Result"
                : "Round Result"
            }
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  height: "10px",
                  width: "100%",
                  background: "#ddd",
                  borderRadius: "5px",
                  marginBottom: "15px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${(roundScore / 5000) * 100}%`,
                    background: "#4CAF50",
                  }}
                ></div>
              </div>

              <h1
                style={{ fontSize: "42px", margin: "5px 0", color: "#4CAF50" }}
              >
                {roundScore} pts
              </h1>
              <p
                style={{
                  fontSize: "18px",
                  color: "#555",
                  marginBottom: "20px",
                }}
              >
                Distance: <strong>{distanceMeters?.toFixed(0)} meters</strong>
              </p>

              {currentChallenge.funFact && (
                <div
                  style={{
                    backgroundColor: "#f9f9f9",
                    padding: "15px",
                    borderRadius: "8px",
                    borderLeft: "4px solid #fccf04",
                    textAlign: "left",
                    marginBottom: "20px",
                    fontStyle: "italic",
                    color: "#444",
                  }}
                >
                  <strong>Did you know?</strong>
                  <br />
                  {currentChallenge.funFact}
                </div>
              )}

              <button
                onClick={handleNextRound}
                style={{
                  marginTop: "10px",
                  padding: "12px 30px",
                  background: "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "18px",
                  fontWeight: "bold",
                }}
              >
                {round < TOTAL_ROUNDS ? "Next Round" : "Finish Game"}
              </button>
            </div>
          </DraggableResult>
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
            background: "#fccf04",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "40px",
              borderRadius: "20px",
              textAlign: "center",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
              width: "90%",
              maxWidth: "500px",
            }}
          >
            <h1
              style={{ fontSize: "36px", color: "#333", marginBottom: "10px" }}
            >
              Game Over!
            </h1>

            <div style={{ margin: "30px 0" }}>
              <div
                style={{
                  fontSize: "16px",
                  textTransform: "uppercase",
                  color: "#888",
                  letterSpacing: "1px",
                }}
              >
                Final Score
              </div>
              <div
                style={{
                  fontSize: "64px",
                  fontWeight: "bold",
                  color: "#2196F3",
                }}
              >
                {totalScore}{" "}
                <span style={{ fontSize: "24px", color: "#aaa" }}>/ 25000</span>
              </div>
            </div>

            <div
              style={{
                marginBottom: "30px",
                borderTop: "1px solid #eee",
                borderBottom: "1px solid #eee",
                padding: "15px 0",
              }}
            >
              {roundHistory.map((score, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: index < 4 ? "1px dashed #eee" : "none",
                  }}
                >
                  <span style={{ color: "#555", fontWeight: "bold" }}>
                    Round {index + 1}
                  </span>
                  <span style={{ color: "#333" }}>{score} pts</span>
                </div>
              ))}
            </div>

            <button
              onClick={restartGame}
              style={{
                padding: "15px 40px",
                background: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "20px",
                fontWeight: "bold",
              }}
            >
              Play Again
            </button>

            <button
              onClick={onExit}
              style={{
                padding: "15px 40px",
                background: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "20px",
                fontWeight: "bold",
                marginLeft: "10px",
              }}
            >
              Exit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
