/**
 * SALMAN EDIT-Z — 105 AI Template Definitions
 *
 * Each template maps to a BgSwapState + scoring factors for Magic AI.
 * Magic AI samples the video frame and scores each template to find the best match.
 *
 * Categories:
 *  Animals (25) | Cyberpunk (15) | Space (15) | Nature (15)
 *  Cinematic (15) | Future2030 (10) | Drama (10)
 */

import type { BgId, BgSwapState } from "./components/BgSwapPanel";

export interface AITemplate {
  id: string;
  name: string;
  emoji: string;
  category: string;
  description: string;
  isPremium: boolean;
  /** CSS gradient string for the card preview thumbnail */
  previewGradient: string;
  /** Full BgSwapState to apply when selected */
  bgConfig: BgSwapState;
  /** Magic AI scoring hints */
  magic: {
    prefersDark?: boolean;   // score up for dark video frames
    prefersLight?: boolean;  // score up for bright video frames
    prefersWarm?: boolean;   // score up for warm (red/orange) dominant tone
    prefersCool?: boolean;   // score up for cool (blue/cyan) dominant tone
    prefersGreen?: boolean;  // score up for green-heavy frames
    prefersHighContrast?: boolean;
  };
}

export const CATEGORIES = [
  { id: "all",      label: "All",        emoji: "✨" },
  { id: "animals",  label: "Animals",    emoji: "🐺" },
  { id: "cyberpunk",label: "Cyberpunk",  emoji: "🌆" },
  { id: "space",    label: "Space",      emoji: "🚀" },
  { id: "nature",   label: "Nature",     emoji: "🌿" },
  { id: "cinematic",label: "Cinematic",  emoji: "🎬" },
  { id: "future",   label: "2030+",      emoji: "🤖" },
  { id: "drama",    label: "Drama",      emoji: "⚡" },
] as const;

export type CategoryId = typeof CATEGORIES[number]["id"];

const mk = (
  bgId: BgId,
  blendOpacity = 0.88,
  autoColorEnabled = true,
  autoColorIntensity = 0.7,
  segEnabled = true,
): BgSwapState => ({ bgId, blendOpacity, autoColorEnabled, autoColorIntensity, segEnabled });

export const ALL_TEMPLATES: AITemplate[] = [
  /* ═══════════════════ ANIMALS (25) ═══════════════════════ */
  {
    id: "wolf_night",     name: "Night Wolf",       emoji: "🐺", category: "animals",
    description: "Dark forest with glowing wolf eyes",  isPremium: false,
    previewGradient: "linear-gradient(135deg,#000a00,#041200,#0a1a00)",
    bgConfig: mk("wolf_forest", 0.88, true, 0.75),
    magic: { prefersDark: true, prefersGreen: true },
  },
  {
    id: "wolf_mist",      name: "Mist Wolf",        emoji: "🌫️", category: "animals",
    description: "Foggy midnight forest hunt",          isPremium: true,
    previewGradient: "linear-gradient(135deg,#080810,#101820,#081018)",
    bgConfig: mk("wolf_forest", 0.82, true, 0.6),
    magic: { prefersDark: true, prefersCool: true },
  },
  {
    id: "wolf_moon",      name: "Howl at the Moon", emoji: "🌕", category: "animals",
    description: "Full moon rising over wolf territory", isPremium: false,
    previewGradient: "linear-gradient(135deg,#020510,#040a1a,#080e18)",
    bgConfig: mk("wolf_forest", 0.85, true, 0.65),
    magic: { prefersDark: true, prefersCool: true },
  },
  {
    id: "lion_gold",      name: "Golden Lion",      emoji: "🦁", category: "animals",
    description: "Regal white lion — power pose",       isPremium: true,
    previewGradient: "linear-gradient(135deg,#1a0800,#3d1400,#6b2800)",
    bgConfig: mk("jungle", 0.9, true, 0.8),
    magic: { prefersWarm: true, prefersLight: true },
  },
  {
    id: "tiger_fire",     name: "Fire Tiger",       emoji: "🐯", category: "animals",
    description: "Blazing jungle ambush",               isPremium: true,
    previewGradient: "linear-gradient(135deg,#1a0500,#401000,#7a2000)",
    bgConfig: mk("jungle", 0.87, true, 0.85),
    magic: { prefersWarm: true, prefersDark: true },
  },
  {
    id: "eagle_sky",      name: "Eagle Sky",        emoji: "🦅", category: "animals",
    description: "Majestic eagle soaring above clouds", isPremium: false,
    previewGradient: "linear-gradient(135deg,#050a1a,#0a1530,#101a40)",
    bgConfig: mk("starship", 0.85, true, 0.7),
    magic: { prefersLight: true, prefersCool: true },
  },
  {
    id: "panther_dark",   name: "Black Panther",    emoji: "🐆", category: "animals",
    description: "Stealth hunter in shadows",           isPremium: true,
    previewGradient: "linear-gradient(135deg,#000000,#050505,#0a0005)",
    bgConfig: mk("wolf_forest", 0.92, true, 0.5),
    magic: { prefersDark: true },
  },
  {
    id: "dragon_cave",    name: "Dragon Lair",      emoji: "🐉", category: "animals",
    description: "Ancient dragon's volcanic lair",      isPremium: true,
    previewGradient: "linear-gradient(135deg,#1a0000,#400000,#7a1000)",
    bgConfig: mk("storm", 0.88, true, 0.8),
    magic: { prefersDark: true, prefersWarm: true },
  },
  {
    id: "phoenix_rise",   name: "Phoenix Rising",   emoji: "🦋", category: "animals",
    description: "Born from flames, reborn in glory",   isPremium: true,
    previewGradient: "linear-gradient(135deg,#1a0800,#5c2800,#ff4400)",
    bgConfig: mk("storm", 0.9, true, 0.9),
    magic: { prefersWarm: true, prefersHighContrast: true },
  },
  {
    id: "bear_forest",    name: "Mountain Bear",    emoji: "🐻", category: "animals",
    description: "Ancient forest guardian",             isPremium: false,
    previewGradient: "linear-gradient(135deg,#040a00,#081400,#0d1e00)",
    bgConfig: mk("wolf_forest", 0.86, true, 0.6),
    magic: { prefersDark: true, prefersGreen: true },
  },
  {
    id: "snow_leopard",   name: "Snow Leopard",     emoji: "❄️", category: "animals",
    description: "Silent predator of frozen peaks",     isPremium: true,
    previewGradient: "linear-gradient(135deg,#000510,#00081a,#000a20)",
    bgConfig: mk("moon", 0.85, true, 0.65),
    magic: { prefersCool: true, prefersLight: true },
  },
  {
    id: "shark_depth",    name: "Deep Shark",       emoji: "🦈", category: "animals",
    description: "Ocean depths, primal fear",           isPremium: false,
    previewGradient: "linear-gradient(135deg,#000510,#001020,#001530)",
    bgConfig: mk("starship", 0.88, true, 0.7),
    magic: { prefersDark: true, prefersCool: true },
  },
  {
    id: "raven_sky",      name: "Dark Raven",       emoji: "🪶", category: "animals",
    description: "Mystery of the midnight raven",       isPremium: false,
    previewGradient: "linear-gradient(135deg,#000005,#050008,#0a000d)",
    bgConfig: mk("wolf_forest", 0.9, true, 0.55),
    magic: { prefersDark: true },
  },
  {
    id: "cobra_strike",   name: "King Cobra",       emoji: "🐍", category: "animals",
    description: "Deadly strike from the shadows",      isPremium: true,
    previewGradient: "linear-gradient(135deg,#001a00,#003300,#005500)",
    bgConfig: mk("jungle", 0.9, true, 0.7),
    magic: { prefersGreen: true, prefersDark: true },
  },
  {
    id: "ox_power",       name: "Wild Ox",          emoji: "🐂", category: "animals",
    description: "Unstoppable force of nature",         isPremium: false,
    previewGradient: "linear-gradient(135deg,#0d0800,#201000,#351800)",
    bgConfig: mk("jungle", 0.88, true, 0.65),
    magic: { prefersWarm: true, prefersDark: true },
  },
  {
    id: "cheetah_speed",  name: "Cheetah Sprint",   emoji: "💨", category: "animals",
    description: "0 to 112km/h in three seconds",       isPremium: false,
    previewGradient: "linear-gradient(135deg,#1a1000,#3d2800,#5c3a00)",
    bgConfig: mk("jungle", 0.86, true, 0.72),
    magic: { prefersWarm: true },
  },
  {
    id: "wolf_pack",      name: "Wolf Pack",        emoji: "🐺", category: "animals",
    description: "Alpha leads the pack through snow",   isPremium: true,
    previewGradient: "linear-gradient(135deg,#020808,#040e12,#081418)",
    bgConfig: mk("wolf_forest", 0.84, true, 0.7),
    magic: { prefersDark: true, prefersCool: true },
  },
  {
    id: "rhino_charge",   name: "Rhino Charge",     emoji: "🦏", category: "animals",
    description: "Unstoppable momentum",                isPremium: false,
    previewGradient: "linear-gradient(135deg,#0a0800,#181200,#281c00)",
    bgConfig: mk("jungle", 0.87, true, 0.6),
    magic: { prefersWarm: true, prefersDark: true },
  },
  {
    id: "jaguar_night",   name: "Jaguar Night",     emoji: "🌑", category: "animals",
    description: "Spotted shadow in the dark",          isPremium: true,
    previewGradient: "linear-gradient(135deg,#040200,#090500,#0e0800)",
    bgConfig: mk("wolf_forest", 0.91, true, 0.58),
    magic: { prefersDark: true, prefersWarm: true },
  },
  {
    id: "lion_savannah",  name: "Savannah King",    emoji: "👑", category: "animals",
    description: "King surveys his golden kingdom",     isPremium: true,
    previewGradient: "linear-gradient(135deg,#2a1800,#5a3000,#8a5000)",
    bgConfig: mk("jungle", 0.89, true, 0.8),
    magic: { prefersWarm: true, prefersLight: true },
  },
  {
    id: "white_tiger",    name: "White Tiger",      emoji: "🐅", category: "animals",
    description: "Rare majestic white tiger spirit",    isPremium: true,
    previewGradient: "linear-gradient(135deg,#0a1020,#10183a,#181e4a)",
    bgConfig: mk("moon", 0.85, true, 0.7),
    magic: { prefersCool: true, prefersLight: true },
  },
  {
    id: "wolf_arctic",    name: "Arctic Wolf",      emoji: "⚪", category: "animals",
    description: "Pure white wolf in the frozen tundra", isPremium: false,
    previewGradient: "linear-gradient(135deg,#050810,#0a1018,#0f1820)",
    bgConfig: mk("moon", 0.87, true, 0.6),
    magic: { prefersCool: true },
  },
  {
    id: "gorilla_wild",   name: "Silverback",       emoji: "🦍", category: "animals",
    description: "800-pound forest king",               isPremium: false,
    previewGradient: "linear-gradient(135deg,#040a00,#081400,#0c1800)",
    bgConfig: mk("jungle", 0.9, true, 0.65),
    magic: { prefersGreen: true, prefersDark: true },
  },
  {
    id: "wolf_red",       name: "Red Wolf",         emoji: "🔴", category: "animals",
    description: "Fiery spirit of the burning forest",  isPremium: true,
    previewGradient: "linear-gradient(135deg,#200000,#400800,#600a00)",
    bgConfig: mk("storm", 0.87, true, 0.82),
    magic: { prefersWarm: true, prefersDark: true, prefersHighContrast: true },
  },
  {
    id: "cat_midnight",   name: "Midnight Cat",     emoji: "🐈‍⬛", category: "animals",
    description: "Nine lives, infinite mystery",        isPremium: false,
    previewGradient: "linear-gradient(135deg,#000000,#050000,#080000)",
    bgConfig: mk("wolf_forest", 0.93, true, 0.5),
    magic: { prefersDark: true },
  },

  /* ═══════════════════ CYBERPUNK (15) ═══════════════════════ */
  {
    id: "cyber_city",     name: "Neon City",        emoji: "🌆", category: "cyberpunk",
    description: "2077 neon-soaked metropolis",         isPremium: false,
    previewGradient: "linear-gradient(135deg,#000010,#080020,#0d0035)",
    bgConfig: mk("city", 0.88, true, 0.75),
    magic: { prefersDark: true, prefersCool: true },
  },
  {
    id: "cyber_rain2",    name: "Cyber Rain",       emoji: "🌧️", category: "cyberpunk",
    description: "Neon reflections in the acid rain",   isPremium: true,
    previewGradient: "linear-gradient(135deg,#000008,#000a00,#001000)",
    bgConfig: mk("cyber_rain", 0.88, true, 0.8),
    magic: { prefersDark: true, prefersGreen: true },
  },
  {
    id: "matrix_code",    name: "The Matrix",       emoji: "💚", category: "cyberpunk",
    description: "Wake up, Neo. Follow the code.",      isPremium: true,
    previewGradient: "linear-gradient(135deg,#001000,#003000,#005000)",
    bgConfig: mk("cyber_rain", 0.9, true, 0.85),
    magic: { prefersGreen: true, prefersDark: true },
  },
  {
    id: "neon_portal",    name: "Neon Portal",      emoji: "🌀", category: "cyberpunk",
    description: "Step through to another dimension",   isPremium: true,
    previewGradient: "linear-gradient(135deg,#0a0020,#200040,#400060)",
    bgConfig: mk("city", 0.86, true, 0.9),
    magic: { prefersCool: true, prefersHighContrast: true },
  },
  {
    id: "glitch_world",   name: "Glitch World",     emoji: "📺", category: "cyberpunk",
    description: "Reality is just corrupted data",      isPremium: false,
    previewGradient: "linear-gradient(135deg,#080010,#100020,#180030)",
    bgConfig: mk("city", 0.85, true, 0.7),
    magic: { prefersDark: true, prefersCool: true },
  },
  {
    id: "blade_runner",   name: "Blade Runner",     emoji: "🗡️", category: "cyberpunk",
    description: "Hunt replicants in the rain",         isPremium: true,
    previewGradient: "linear-gradient(135deg,#0a0010,#140020,#1e0030)",
    bgConfig: mk("city", 0.9, true, 0.82),
    magic: { prefersDark: true, prefersCool: true, prefersHighContrast: true },
  },
  {
    id: "cyber_samurai",  name: "Cyber Samurai",    emoji: "⚔️", category: "cyberpunk",
    description: "Ancient code meets future steel",     isPremium: false,
    previewGradient: "linear-gradient(135deg,#100000,#200010,#300020)",
    bgConfig: mk("city", 0.87, true, 0.78),
    magic: { prefersDark: true, prefersWarm: true },
  },
  {
    id: "digital_ghost",  name: "Digital Ghost",    emoji: "👻", category: "cyberpunk",
    description: "Ghost in the machine",               isPremium: false,
    previewGradient: "linear-gradient(135deg,#050012,#0a0025,#0f0038)",
    bgConfig: mk("cyber_rain", 0.85, true, 0.72),
    magic: { prefersDark: true },
  },
  {
    id: "hacker_green",   name: "Elite Hacker",     emoji: "💻", category: "cyberpunk",
    description: "I'm in. Firewall bypassed.",          isPremium: false,
    previewGradient: "linear-gradient(135deg,#002000,#005000,#008000)",
    bgConfig: mk("cyber_rain", 0.88, true, 0.9),
    magic: { prefersGreen: true },
  },
  {
    id: "neon_warrior",   name: "Neon Warrior",     emoji: "⚡", category: "cyberpunk",
    description: "Charged up and dangerous",            isPremium: true,
    previewGradient: "linear-gradient(135deg,#000015,#000830,#001045)",
    bgConfig: mk("city", 0.89, true, 0.88),
    magic: { prefersDark: true, prefersCool: true, prefersHighContrast: true },
  },
  {
    id: "cyber_queen",    name: "Cyber Queen",      emoji: "👑", category: "cyberpunk",
    description: "Rule the digital empire",             isPremium: true,
    previewGradient: "linear-gradient(135deg,#080010,#180030,#280050)",
    bgConfig: mk("city", 0.86, true, 0.85),
    magic: { prefersDark: true, prefersCool: true },
  },
  {
    id: "punk_alley",     name: "Punk Alley",       emoji: "🏙️", category: "cyberpunk",
    description: "Back alleys of Neo-Tokyo",            isPremium: false,
    previewGradient: "linear-gradient(135deg,#050008,#0d0015,#150022)",
    bgConfig: mk("city", 0.88, true, 0.73),
    magic: { prefersDark: true },
  },
  {
    id: "electric_soul",  name: "Electric Soul",    emoji: "💡", category: "cyberpunk",
    description: "Electricity runs through my veins",   isPremium: false,
    previewGradient: "linear-gradient(135deg,#000510,#000a20,#000f30)",
    bgConfig: mk("city", 0.87, true, 0.76),
    magic: { prefersCool: true, prefersHighContrast: true },
  },
  {
    id: "virtual_king",   name: "Virtual King",     emoji: "🕹️", category: "cyberpunk",
    description: "I own every server on this grid",     isPremium: true,
    previewGradient: "linear-gradient(135deg,#010010,#050025,#0a003a)",
    bgConfig: mk("cyber_rain", 0.89, true, 0.8),
    magic: { prefersDark: true, prefersCool: true },
  },
  {
    id: "city_rage",      name: "City Rage",        emoji: "😤", category: "cyberpunk",
    description: "The city never sleeps, neither do I", isPremium: false,
    previewGradient: "linear-gradient(135deg,#0a0005,#150010,#200015)",
    bgConfig: mk("city", 0.91, true, 0.7),
    magic: { prefersDark: true },
  },

  /* ═══════════════════ SPACE (15) ═══════════════════════════ */
  {
    id: "starship_main",  name: "Starship",         emoji: "🚀", category: "space",
    description: "Intergalactic mission at warp speed", isPremium: false,
    previewGradient: "linear-gradient(135deg,#000005,#000015,#000025)",
    bgConfig: mk("starship", 0.88, true, 0.75),
    magic: { prefersDark: true, prefersCool: true },
  },
  {
    id: "moon_base",      name: "Moon Base Alpha",  emoji: "🌕", category: "space",
    description: "First lunar colony, year 2041",       isPremium: false,
    previewGradient: "linear-gradient(135deg,#000002,#050508,#0a0a10)",
    bgConfig: mk("moon", 0.88, true, 0.65),
    magic: { prefersCool: true, prefersLight: true },
  },
  {
    id: "galaxy_core",    name: "Galaxy Core",      emoji: "🌌", category: "space",
    description: "At the heart of the Milky Way",       isPremium: true,
    previewGradient: "linear-gradient(135deg,#000010,#050025,#0a003a)",
    bgConfig: mk("starship", 0.86, true, 0.8),
    magic: { prefersDark: true, prefersCool: true },
  },
  {
    id: "mars_colony",    name: "Mars Colony",      emoji: "🔴", category: "space",
    description: "Humanity's next home — red and alive", isPremium: true,
    previewGradient: "linear-gradient(135deg,#1a0500,#300a00,#450f00)",
    bgConfig: mk("storm", 0.85, true, 0.7),
    magic: { prefersWarm: true, prefersDark: true },
  },
  {
    id: "black_hole",     name: "Black Hole",       emoji: "🕳️", category: "space",
    description: "Nothing escapes, not even light",     isPremium: true,
    previewGradient: "linear-gradient(135deg,#000000,#000005,#000008)",
    bgConfig: mk("starship", 0.9, true, 0.85),
    magic: { prefersDark: true },
  },
  {
    id: "nebula_storm",   name: "Nebula Storm",     emoji: "🌠", category: "space",
    description: "Born in a stellar nursery",           isPremium: false,
    previewGradient: "linear-gradient(135deg,#050010,#100025,#15003a)",
    bgConfig: mk("starship", 0.87, true, 0.78),
    magic: { prefersDark: true, prefersCool: true },
  },
  {
    id: "space_station",  name: "Space Station",    emoji: "🛸", category: "space",
    description: "400km above Earth, watching",         isPremium: false,
    previewGradient: "linear-gradient(135deg,#000008,#000510,#000818)",
    bgConfig: mk("starship", 0.88, true, 0.72),
    magic: { prefersDark: true, prefersCool: true },
  },
  {
    id: "comet_rider",    name: "Comet Rider",      emoji: "☄️", category: "space",
    description: "Surfing through the asteroid belt",   isPremium: true,
    previewGradient: "linear-gradient(135deg,#000510,#000a20,#001030)",
    bgConfig: mk("starship", 0.85, true, 0.8),
    magic: { prefersCool: true, prefersDark: true },
  },
  {
    id: "star_commander", name: "Star Commander",   emoji: "⭐", category: "space",
    description: "I command the stars",                 isPremium: false,
    previewGradient: "linear-gradient(135deg,#020010,#050020,#080030)",
    bgConfig: mk("starship", 0.89, true, 0.7),
    magic: { prefersDark: true },
  },
  {
    id: "saturn_rings",   name: "Saturn Rising",    emoji: "🪐", category: "space",
    description: "Approaching the ringed giant",        isPremium: true,
    previewGradient: "linear-gradient(135deg,#040818,#080e28,#0c1438)",
    bgConfig: mk("moon", 0.86, true, 0.7),
    magic: { prefersCool: true, prefersLight: true },
  },
  {
    id: "lunar_walk",     name: "Lunar Walk",       emoji: "👨‍🚀", category: "space",
    description: "One small step for man...",           isPremium: false,
    previewGradient: "linear-gradient(135deg,#030508,#060a10,#090f18)",
    bgConfig: mk("moon", 0.87, true, 0.62),
    magic: { prefersCool: true },
  },
  {
    id: "dark_matter",    name: "Dark Matter",      emoji: "🌑", category: "space",
    description: "Invisible force shaping reality",     isPremium: true,
    previewGradient: "linear-gradient(135deg,#000000,#010005,#02000a)",
    bgConfig: mk("starship", 0.91, true, 0.88),
    magic: { prefersDark: true },
  },
  {
    id: "pulsar",         name: "Pulsar",           emoji: "💫", category: "space",
    description: "Spinning neutron star, extreme",      isPremium: false,
    previewGradient: "linear-gradient(135deg,#000008,#000810,#001018)",
    bgConfig: mk("starship", 0.87, true, 0.76),
    magic: { prefersDark: true, prefersCool: true },
  },
  {
    id: "stardust",       name: "Stardust",         emoji: "✨", category: "space",
    description: "We are all made of stars",            isPremium: false,
    previewGradient: "linear-gradient(135deg,#050010,#0a0025,#0f003a)",
    bgConfig: mk("starship", 0.85, true, 0.73),
    magic: { prefersDark: true },
  },
  {
    id: "void_walker",    name: "Void Walker",      emoji: "🚶", category: "space",
    description: "Walking between dimensions",          isPremium: true,
    previewGradient: "linear-gradient(135deg,#000000,#020005,#040008)",
    bgConfig: mk("starship", 0.9, true, 0.82),
    magic: { prefersDark: true, prefersCool: true },
  },

  /* ═══════════════════ NATURE (15) ═══════════════════════════ */
  {
    id: "golden_jungle",  name: "Golden Jungle",    emoji: "🌿", category: "nature",
    description: "Ancient jungle bathed in golden light", isPremium: false,
    previewGradient: "linear-gradient(135deg,#0d0400,#3d1400,#061a00)",
    bgConfig: mk("jungle", 0.88, true, 0.72),
    magic: { prefersGreen: true, prefersWarm: true },
  },
  {
    id: "amazon_rain",    name: "Amazon Rain",      emoji: "🌧️", category: "nature",
    description: "Torrential rains of the Amazon",      isPremium: false,
    previewGradient: "linear-gradient(135deg,#030a00,#061200,#091a00)",
    bgConfig: mk("jungle", 0.86, true, 0.65),
    magic: { prefersGreen: true },
  },
  {
    id: "cherry_blossom", name: "Cherry Blossom",   emoji: "🌸", category: "nature",
    description: "Fleeting beauty of spring",           isPremium: true,
    previewGradient: "linear-gradient(135deg,#200010,#400020,#6a0030)",
    bgConfig: mk("wolf_forest", 0.84, true, 0.6),
    magic: { prefersLight: true, prefersWarm: true },
  },
  {
    id: "desert_storm",   name: "Desert Storm",     emoji: "🏜️", category: "nature",
    description: "Sandstorm swallows the horizon",      isPremium: false,
    previewGradient: "linear-gradient(135deg,#1a1000,#3d2800,#5c3a00)",
    bgConfig: mk("storm", 0.88, true, 0.78),
    magic: { prefersWarm: true, prefersHighContrast: true },
  },
  {
    id: "ice_cave",       name: "Ice Cave",         emoji: "🧊", category: "nature",
    description: "Crystal palace deep in the glacier",  isPremium: true,
    previewGradient: "linear-gradient(135deg,#000a18,#001020,#001528)",
    bgConfig: mk("moon", 0.85, true, 0.7),
    magic: { prefersCool: true, prefersLight: true },
  },
  {
    id: "volcano_erupt",  name: "Volcanic Fury",    emoji: "🌋", category: "nature",
    description: "Earth rages from within",             isPremium: true,
    previewGradient: "linear-gradient(135deg,#200000,#500000,#800500)",
    bgConfig: mk("storm", 0.9, true, 0.88),
    magic: { prefersWarm: true, prefersDark: true, prefersHighContrast: true },
  },
  {
    id: "ocean_depth",    name: "Ocean Abyss",      emoji: "🌊", category: "nature",
    description: "Deepest trenches of the Pacific",     isPremium: false,
    previewGradient: "linear-gradient(135deg,#000518,#001030,#001540)",
    bgConfig: mk("starship", 0.87, true, 0.72),
    magic: { prefersCool: true, prefersDark: true },
  },
  {
    id: "monsoon",        name: "Monsoon",          emoji: "⛈️", category: "nature",
    description: "When the heavens open up",            isPremium: false,
    previewGradient: "linear-gradient(135deg,#080810,#101018,#181820)",
    bgConfig: mk("storm", 0.87, true, 0.75),
    magic: { prefersCool: true, prefersDark: true },
  },
  {
    id: "sunrise_peak",   name: "Summit Sunrise",   emoji: "🌄", category: "nature",
    description: "First light over the Himalayas",      isPremium: false,
    previewGradient: "linear-gradient(135deg,#1a0800,#3d1a00,#5c2800)",
    bgConfig: mk("jungle", 0.85, true, 0.8),
    magic: { prefersWarm: true, prefersLight: true },
  },
  {
    id: "aurora_borealis",name: "Aurora Borealis",  emoji: "🌈", category: "nature",
    description: "Northern lights shimmer above",       isPremium: true,
    previewGradient: "linear-gradient(135deg,#001510,#002a20,#003530)",
    bgConfig: mk("moon", 0.83, true, 0.82),
    magic: { prefersCool: true, prefersGreen: true },
  },
  {
    id: "monsoon_forest", name: "Monsoon Forest",   emoji: "🌳", category: "nature",
    description: "Ancient trees in the heavy rain",     isPremium: false,
    previewGradient: "linear-gradient(135deg,#020800,#040e00,#061400)",
    bgConfig: mk("wolf_forest", 0.87, true, 0.65),
    magic: { prefersGreen: true, prefersDark: true },
  },
  {
    id: "fire_field",     name: "Wildfire",         emoji: "🔥", category: "nature",
    description: "Fields of fire, unstoppable",         isPremium: true,
    previewGradient: "linear-gradient(135deg,#200000,#601000,#a02000)",
    bgConfig: mk("storm", 0.89, true, 0.9),
    magic: { prefersWarm: true, prefersHighContrast: true },
  },
  {
    id: "bamboo_forest",  name: "Bamboo Forest",    emoji: "🎍", category: "nature",
    description: "Meditate in the green stillness",     isPremium: false,
    previewGradient: "linear-gradient(135deg,#021000,#042000,#063000)",
    bgConfig: mk("jungle", 0.84, true, 0.6),
    magic: { prefersGreen: true },
  },
  {
    id: "night_sea",      name: "Night Sea",        emoji: "🌊", category: "nature",
    description: "Endless dark ocean under stars",      isPremium: false,
    previewGradient: "linear-gradient(135deg,#000510,#000818,#000b20)",
    bgConfig: mk("moon", 0.88, true, 0.65),
    magic: { prefersCool: true, prefersDark: true },
  },
  {
    id: "waterfall",      name: "Sacred Waterfall", emoji: "💧", category: "nature",
    description: "Where ancient rivers meet the soul",  isPremium: true,
    previewGradient: "linear-gradient(135deg,#001520,#002a35,#003a4a)",
    bgConfig: mk("wolf_forest", 0.83, true, 0.68),
    magic: { prefersCool: true, prefersGreen: true },
  },

  /* ═══════════════════ CINEMATIC (15) ════════════════════════ */
  {
    id: "palace_gold",    name: "Golden Palace",    emoji: "🏛️", category: "cinematic",
    description: "Ornate hall of an ancient empire",    isPremium: false,
    previewGradient: "linear-gradient(135deg,#1a0a00,#3d2000,#6a3800)",
    bgConfig: mk("palace", 0.88, true, 0.82),
    magic: { prefersWarm: true, prefersLight: true },
  },
  {
    id: "dark_throne",    name: "Dark Throne",      emoji: "🪑", category: "cinematic",
    description: "Where power is absolute",             isPremium: true,
    previewGradient: "linear-gradient(135deg,#100500,#200a00,#301000)",
    bgConfig: mk("palace", 0.9, true, 0.75),
    magic: { prefersWarm: true, prefersDark: true },
  },
  {
    id: "royal_court",    name: "Royal Court",      emoji: "👸", category: "cinematic",
    description: "Marble halls of royalty",             isPremium: true,
    previewGradient: "linear-gradient(135deg,#1a1000,#3a2500,#5a3800)",
    bgConfig: mk("palace", 0.87, true, 0.8),
    magic: { prefersWarm: true, prefersLight: true },
  },
  {
    id: "cinema_black",   name: "Cinematic Black",  emoji: "🎬", category: "cinematic",
    description: "Hollywood-level dark drama",          isPremium: false,
    previewGradient: "linear-gradient(135deg,#020202,#050505,#080808)",
    bgConfig: mk("wolf_forest", 0.92, true, 0.55),
    magic: { prefersDark: true },
  },
  {
    id: "golden_age",     name: "Golden Age",       emoji: "✨", category: "cinematic",
    description: "Era of legends — everything glows gold", isPremium: true,
    previewGradient: "linear-gradient(135deg,#1a1000,#4a3000,#7a5000)",
    bgConfig: mk("palace", 0.86, true, 0.88),
    magic: { prefersWarm: true, prefersHighContrast: true },
  },
  {
    id: "empire_falls",   name: "Empire Falls",     emoji: "🏰", category: "cinematic",
    description: "Epic collapse of an ancient empire",  isPremium: false,
    previewGradient: "linear-gradient(135deg,#100800,#280e00,#401500)",
    bgConfig: mk("storm", 0.88, true, 0.78),
    magic: { prefersWarm: true, prefersDark: true },
  },
  {
    id: "last_stand",     name: "Last Stand",       emoji: "⚔️", category: "cinematic",
    description: "One warrior. One chance.",            isPremium: true,
    previewGradient: "linear-gradient(135deg,#0a0500,#180a00,#281000)",
    bgConfig: mk("storm", 0.9, true, 0.85),
    magic: { prefersDark: true, prefersHighContrast: true },
  },
  {
    id: "palace_night",   name: "Night Palace",     emoji: "🌙", category: "cinematic",
    description: "Forbidden palace under moonlight",    isPremium: false,
    previewGradient: "linear-gradient(135deg,#050308,#0a0610,#0f0918)",
    bgConfig: mk("palace", 0.89, true, 0.7),
    magic: { prefersWarm: true, prefersDark: true },
  },
  {
    id: "battle_throne",  name: "Battle Throne",    emoji: "🗡️", category: "cinematic",
    description: "Claim what is rightfully yours",      isPremium: true,
    previewGradient: "linear-gradient(135deg,#0f0300,#200600,#310a00)",
    bgConfig: mk("palace", 0.91, true, 0.76),
    magic: { prefersWarm: true, prefersDark: true },
  },
  {
    id: "crimson_curtain",name: "Crimson Curtain",  emoji: "🎭", category: "cinematic",
    description: "The stage is set. Drama begins.",     isPremium: false,
    previewGradient: "linear-gradient(135deg,#180000,#380000,#580000)",
    bgConfig: mk("palace", 0.87, true, 0.8),
    magic: { prefersWarm: true },
  },
  {
    id: "hero_entrance",  name: "Hero Entrance",    emoji: "🦸", category: "cinematic",
    description: "Make an entrance they'll never forget", isPremium: false,
    previewGradient: "linear-gradient(135deg,#080008,#10001a,#18002c)",
    bgConfig: mk("city", 0.88, true, 0.8),
    magic: { prefersDark: true, prefersCool: true, prefersHighContrast: true },
  },
  {
    id: "villain_rise",   name: "Villain Rise",     emoji: "😈", category: "cinematic",
    description: "Every story needs its villain",       isPremium: true,
    previewGradient: "linear-gradient(135deg,#050005,#0d000d,#150015)",
    bgConfig: mk("storm", 0.92, true, 0.88),
    magic: { prefersDark: true, prefersHighContrast: true },
  },
  {
    id: "legendary",      name: "Legendary",        emoji: "🏆", category: "cinematic",
    description: "Legends never die",                   isPremium: true,
    previewGradient: "linear-gradient(135deg,#1a0a00,#402000,#6a3800)",
    bgConfig: mk("palace", 0.88, true, 0.85),
    magic: { prefersWarm: true, prefersLight: true },
  },
  {
    id: "warlord",        name: "Warlord",          emoji: "👹", category: "cinematic",
    description: "Command armies, fear nothing",        isPremium: false,
    previewGradient: "linear-gradient(135deg,#0a0000,#180000,#280000)",
    bgConfig: mk("storm", 0.9, true, 0.83),
    magic: { prefersDark: true, prefersWarm: true },
  },
  {
    id: "oscar_night",    name: "Oscar Night",      emoji: "🎬", category: "cinematic",
    description: "And the award goes to...",            isPremium: false,
    previewGradient: "linear-gradient(135deg,#120800,#2a1400,#422000)",
    bgConfig: mk("palace", 0.86, true, 0.77),
    magic: { prefersWarm: true, prefersLight: true },
  },

  /* ═══════════════════ 2030 FUTURE (10) ═══════════════════════ */
  {
    id: "future_city",    name: "Future City 2030", emoji: "🤖", category: "future",
    description: "The city of tomorrow, today",         isPremium: true,
    previewGradient: "linear-gradient(135deg,#000018,#000530,#000a48)",
    bgConfig: mk("city", 0.87, true, 0.88),
    magic: { prefersDark: true, prefersCool: true },
  },
  {
    id: "ai_world",       name: "AI Dimension",     emoji: "🧠", category: "future",
    description: "When machines think like gods",       isPremium: true,
    previewGradient: "linear-gradient(135deg,#000510,#001020,#001530)",
    bgConfig: mk("cyber_rain", 0.88, true, 0.85),
    magic: { prefersDark: true, prefersGreen: true },
  },
  {
    id: "hologram_stage", name: "Hologram Stage",   emoji: "📡", category: "future",
    description: "Project yourself into every room",    isPremium: true,
    previewGradient: "linear-gradient(135deg,#000508,#000a15,#000f22)",
    bgConfig: mk("starship", 0.86, true, 0.82),
    magic: { prefersCool: true, prefersDark: true },
  },
  {
    id: "time_portal",    name: "Time Portal",      emoji: "⏳", category: "future",
    description: "Step through to the year 2099",       isPremium: true,
    previewGradient: "linear-gradient(135deg,#000010,#000828,#001040)",
    bgConfig: mk("starship", 0.88, true, 0.9),
    magic: { prefersDark: true, prefersCool: true, prefersHighContrast: true },
  },
  {
    id: "nano_skin",      name: "Nano Armor",       emoji: "🔬", category: "future",
    description: "Trillion nanobots, one mission",      isPremium: false,
    previewGradient: "linear-gradient(135deg,#001020,#002040,#003060)",
    bgConfig: mk("city", 0.89, true, 0.8),
    magic: { prefersCool: true },
  },
  {
    id: "megacity_2050",  name: "Mega City 2050",   emoji: "🏙️", category: "future",
    description: "500 million people, one grid",        isPremium: false,
    previewGradient: "linear-gradient(135deg,#000012,#000525,#000a38)",
    bgConfig: mk("city", 0.88, true, 0.75),
    magic: { prefersDark: true },
  },
  {
    id: "cyber_evolution",name: "Cyber Evolution",  emoji: "🧬", category: "future",
    description: "Humanity 2.0 is here",                isPremium: true,
    previewGradient: "linear-gradient(135deg,#001008,#002015,#003022)",
    bgConfig: mk("cyber_rain", 0.87, true, 0.87),
    magic: { prefersGreen: true, prefersDark: true },
  },
  {
    id: "transcend",      name: "Transcendence",    emoji: "🌐", category: "future",
    description: "Mind uploaded. Body optional.",       isPremium: true,
    previewGradient: "linear-gradient(135deg,#050010,#0a0025,#0f003a)",
    bgConfig: mk("starship", 0.86, true, 0.86),
    magic: { prefersDark: true, prefersCool: true },
  },
  {
    id: "data_stream",    name: "Data Stream",      emoji: "📊", category: "future",
    description: "Pure information flowing through me", isPremium: false,
    previewGradient: "linear-gradient(135deg,#000a08,#001510,#002018)",
    bgConfig: mk("cyber_rain", 0.89, true, 0.82),
    magic: { prefersGreen: true },
  },
  {
    id: "zero_gravity",   name: "Zero Gravity",     emoji: "🌍", category: "future",
    description: "No rules when there's no gravity",    isPremium: false,
    previewGradient: "linear-gradient(135deg,#000008,#000012,#00001c)",
    bgConfig: mk("moon", 0.85, true, 0.7),
    magic: { prefersDark: true, prefersCool: true },
  },

  /* ═══════════════════ DRAMA/STORM (10) ═══════════════════════ */
  {
    id: "thunder_god",    name: "Thunder God",      emoji: "⚡", category: "drama",
    description: "When lightning bends to my will",     isPremium: true,
    previewGradient: "linear-gradient(135deg,#080810,#101018,#181820)",
    bgConfig: mk("storm", 0.88, true, 0.85),
    magic: { prefersDark: true, prefersHighContrast: true },
  },
  {
    id: "storm_king",     name: "Storm King",       emoji: "👑", category: "drama",
    description: "I am the eye of the storm",           isPremium: false,
    previewGradient: "linear-gradient(135deg,#060810,#0d1018,#141820)",
    bgConfig: mk("storm", 0.89, true, 0.8),
    magic: { prefersDark: true },
  },
  {
    id: "apocalypse",     name: "Apocalypse",       emoji: "🌑", category: "drama",
    description: "End of the world feels personal",     isPremium: true,
    previewGradient: "linear-gradient(135deg,#0a0000,#150000,#200000)",
    bgConfig: mk("storm", 0.91, true, 0.88),
    magic: { prefersDark: true, prefersWarm: true, prefersHighContrast: true },
  },
  {
    id: "war_of_gods",    name: "War of Gods",      emoji: "⚔️", category: "drama",
    description: "Olympus at war — choose your side",   isPremium: true,
    previewGradient: "linear-gradient(135deg,#080810,#0e0e18,#141420)",
    bgConfig: mk("storm", 0.9, true, 0.86),
    magic: { prefersDark: true, prefersHighContrast: true },
  },
  {
    id: "rage_mode",      name: "Rage Mode",        emoji: "😤", category: "drama",
    description: "Channel the storm within",            isPremium: false,
    previewGradient: "linear-gradient(135deg,#100000,#200500,#300a00)",
    bgConfig: mk("storm", 0.87, true, 0.82),
    magic: { prefersWarm: true, prefersHighContrast: true },
  },
  {
    id: "dark_side",      name: "The Dark Side",    emoji: "🌑", category: "drama",
    description: "Come to the dark side. Stay.",        isPremium: false,
    previewGradient: "linear-gradient(135deg,#020202,#050505,#080808)",
    bgConfig: mk("storm", 0.92, true, 0.7),
    magic: { prefersDark: true },
  },
  {
    id: "fallen_warrior", name: "Fallen Warrior",   emoji: "🩸", category: "drama",
    description: "The price of glory",                  isPremium: true,
    previewGradient: "linear-gradient(135deg,#0e0000,#1c0000,#2a0000)",
    bgConfig: mk("storm", 0.9, true, 0.88),
    magic: { prefersDark: true, prefersWarm: true },
  },
  {
    id: "uprising",       name: "Uprising",         emoji: "✊", category: "drama",
    description: "Rise. Fight. Repeat.",                isPremium: false,
    previewGradient: "linear-gradient(135deg,#080008,#100010,#180018)",
    bgConfig: mk("storm", 0.88, true, 0.76),
    magic: { prefersDark: true },
  },
  {
    id: "blood_moon",     name: "Blood Moon",       emoji: "🌑", category: "drama",
    description: "When the moon turns crimson red",     isPremium: true,
    previewGradient: "linear-gradient(135deg,#150000,#280000,#3a0000)",
    bgConfig: mk("storm", 0.87, true, 0.84),
    magic: { prefersWarm: true, prefersDark: true },
  },
  {
    id: "zero_hour",      name: "Zero Hour",        emoji: "💣", category: "drama",
    description: "The countdown has started",           isPremium: false,
    previewGradient: "linear-gradient(135deg,#060608,#0c0c10,#121218)",
    bgConfig: mk("storm", 0.89, true, 0.8),
    magic: { prefersDark: true, prefersHighContrast: true },
  },
];

/* ── Magic AI: Score templates based on video frame analysis ── */
export interface FrameAnalysis {
  brightness: number;   // 0-255
  dominantR: number;    // 0-255
  dominantG: number;    // 0-255
  dominantB: number;    // 0-255
  contrast: number;     // 0-1 (std dev / 128)
}

export function analyzeFrame(videoEl: HTMLVideoElement): FrameAnalysis {
  const size = 32;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(videoEl, 0, 0, size, size);
  const d = ctx.getImageData(0, 0, size, size).data;
  let r = 0, g = 0, b = 0, bright = 0;
  const count = (size * size);
  for (let i = 0; i < d.length; i += 4) {
    r += d[i]; g += d[i + 1]; b += d[i + 2];
    bright += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
  }
  r /= count; g /= count; b /= count; bright /= count;

  // Compute contrast as variance-like measure
  let variance = 0;
  for (let i = 0; i < d.length; i += 4) {
    const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    variance += (lum - bright) ** 2;
  }
  const contrast = Math.min(1, Math.sqrt(variance / count) / 80);

  return { brightness: bright, dominantR: r, dominantG: g, dominantB: b, contrast };
}

export function scoreTemplate(t: AITemplate, analysis: FrameAnalysis): number {
  const { brightness: br, dominantR: r, dominantG: g, dominantB: b, contrast: ct } = analysis;
  const isWarm = r > b * 1.25 && r > g * 1.1;
  const isCool = b > r * 1.15;
  const isGreen = g > r * 1.15 && g > b * 1.1;
  const isDark  = br < 100;
  const isLight = br > 155;

  let score = 50;
  const m = t.magic;
  if (m.prefersDark        && isDark)  score += 25;
  if (m.prefersLight       && isLight) score += 22;
  if (m.prefersWarm        && isWarm)  score += 22;
  if (m.prefersCool        && isCool)  score += 22;
  if (m.prefersGreen       && isGreen) score += 20;
  if (m.prefersHighContrast && ct > 0.5) score += 18;
  /* Penalise mismatches */
  if (m.prefersDark  && isLight) score -= 15;
  if (m.prefersLight && isDark)  score -= 15;
  if (m.prefersWarm  && isCool)  score -= 10;
  if (m.prefersCool  && isWarm)  score -= 10;
  /* Small random tie-breaker so same score doesn't always pick index 0 */
  score += Math.random() * 6;
  return score;
}

export function pickBestTemplate(analysis: FrameAnalysis): AITemplate {
  const sorted = [...ALL_TEMPLATES]
    .filter((t) => !t.isPremium) // magic AI only picks free templates
    .map((t) => ({ t, s: scoreTemplate(t, analysis) }))
    .sort((a, b) => b.s - a.s);
  return sorted[0].t;
}
