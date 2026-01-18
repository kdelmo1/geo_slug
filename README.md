# PinTheSlug

**PinTheSlug** is a GeoGuessr-inspired web game where players guess UCSC locations.

---

## What is PinTheSlug?

PinTheSlug drops you into a random location and challenges you to pinpoint where you are on the map. The closer your guess, the higher your score. What differentiates PinTheSlug from GeoGuessr is its UCSC-bound map and its still images of locations that cannot be accessed from Google Maps' street view. 

---

## Tech Stack

* **Frontend:** Vite + TypeScript
* **Framework:** React
* **Maps:** Google Maps
* **Styling:** CSS
* **Build Tool:** Vite

---

## Installs and Steps

- git clone git@github.com:kdelmo1/geo_slug.git
- npm install 
- Go to Supabase Dashboard → Authentication → Sign in / Providers
- Authorized redirect URL: https://<your-project-id>.supabase.co/auth/v1/callback
- Restrict signin to @ucsc.edu (optional)
- Google Cloud Console → Create API Key
- touch .env
- add these following variables
  - VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
  - VITE_SUPABASE_ANON_KEY="KEY"
  - VITE_GOOGLE_MAPS_API_KEY="KEY"
- npm run dev


---

## How to Play

1. You’re dropped into a random location OR you're given an image of a location on the UCSC campus
2. Look around and gather clues
3. Click on the map to place your guess
4. Get scored based on distance from the true location and learn fun facts about campus
5. Repeat and become a master of UCSC!

---

## Future Ideas

* Different gamemodes
* Multiplayer leaderboards
* Community uploaded location images

---

## Acknowledgements

* GeoGuessr
* UCSC :3
* Google Maps
* CruzHacks 2026!

---

*where da slug at*
