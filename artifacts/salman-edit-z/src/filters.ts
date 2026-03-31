export interface VideoFilter {
  id: string;
  name: string;
  css: string;
  emoji: string;
}

export interface NextFilter {
  id: string;
  name: string;
  emoji: string;
  css: string;
  blendColor?: string;
  glowColor?: string;
  glowPx?: number;
  canvasMode?: "rgb-split" | "vhs" | "scanlines" | "neon-bloom";
}

export interface Transition {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  category: string;
  bpm: number;
  tags: string[];
}

export interface Keyframe {
  time: number;
  x: number;
  y: number;
  opacity: number;
  scale: number;
  rotation: number;
}

export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  shadow: boolean;
  keyframes: Keyframe[];
  startTime: number;
  endTime: number;
}

/* ── Filter Library ──────────────────────────────────────── */
export type FilterCategoryId =
  | "all" | "cinematic" | "retro" | "cyberpunk"
  | "nature" | "portrait" | "glitch" | "mood" | "desi";

export interface FilterCat {
  id: FilterCategoryId;
  name: string;
  emoji: string;
}

export const FILTER_CATEGORIES: FilterCat[] = [
  { id: "all",       name: "All",       emoji: "🎨" },
  { id: "cinematic", name: "Cinematic", emoji: "🎬" },
  { id: "retro",     name: "Retro",     emoji: "📼" },
  { id: "cyberpunk", name: "Cyber",     emoji: "🤖" },
  { id: "nature",    name: "Nature",    emoji: "🌿" },
  { id: "portrait",  name: "Portrait",  emoji: "👤" },
  { id: "glitch",    name: "Glitch",    emoji: "⚡" },
  { id: "mood",      name: "Mood",      emoji: "💫" },
  { id: "desi",      name: "Desi",      emoji: "🎪" },
];

export interface ExtendedFilter extends VideoFilter {
  category: FilterCategoryId;
}

export const FILTER_LIBRARY: ExtendedFilter[] = [
  // ── CINEMATIC ─────────────────────────────────────────────────────
  { id: "none",        name: "Original",    emoji: "🎞️", css: "none",                                                                                                         category: "cinematic" },
  { id: "cinema1",     name: "Cinematic",   emoji: "🎬", css: "contrast(130%) saturate(70%) sepia(25%) brightness(90%)",                                                       category: "cinematic" },
  { id: "cinema2",     name: "Teal Orange", emoji: "🍊", css: "contrast(120%) saturate(130%) hue-rotate(172deg) brightness(95%)",                                              category: "cinematic" },
  { id: "cinema3",     name: "Blockbuster", emoji: "🌟", css: "contrast(145%) saturate(65%) brightness(88%) sepia(30%) hue-rotate(-5deg)",                                     category: "cinematic" },
  { id: "cinema4",     name: "Noir",        emoji: "🎩", css: "grayscale(100%) contrast(160%) brightness(80%)",                                                                category: "cinematic" },
  { id: "cinema5",     name: "Dramatic",    emoji: "🎭", css: "contrast(165%) saturate(50%) brightness(80%)",                                                                  category: "cinematic" },
  { id: "cinema6",     name: "Matte",       emoji: "🌫️", css: "contrast(88%) brightness(108%) saturate(82%)",                                                                  category: "cinematic" },
  { id: "cinema7",     name: "LOG Grade",   emoji: "📽️", css: "contrast(78%) brightness(115%) saturate(95%) sepia(5%)",                                                        category: "cinematic" },
  { id: "cinema8",     name: "Thriller",    emoji: "🔪", css: "contrast(155%) saturate(40%) brightness(75%) sepia(20%)",                                                       category: "cinematic" },
  { id: "cinema9",     name: "Epic Scale",  emoji: "⛰️", css: "contrast(135%) saturate(110%) brightness(85%) hue-rotate(-8deg) sepia(15%)",                                   category: "cinematic" },
  { id: "cinema10",    name: "Haze",        emoji: "🌁", css: "brightness(130%) contrast(70%) saturate(65%) blur(0.3px)",                                                      category: "cinematic" },
  { id: "cinema11",    name: "Hollywood",   emoji: "🎦", css: "contrast(125%) saturate(85%) brightness(92%) sepia(18%) hue-rotate(5deg)",                                                    category: "cinematic" },
  { id: "cinema12",    name: "Bleach Byp",  emoji: "🩶", css: "contrast(170%) saturate(40%) brightness(88%)",                                                                                 category: "cinematic" },
  { id: "cinema13",    name: "Prestige",    emoji: "🏆", css: "contrast(118%) saturate(62%) brightness(85%) sepia(35%) hue-rotate(-3deg)",                                                   category: "cinematic" },
  { id: "cinema14",    name: "Sundance",    emoji: "🌻", css: "contrast(95%) saturate(115%) brightness(112%) sepia(10%) hue-rotate(-18deg)",                                                 category: "cinematic" },
  { id: "cinema15",    name: "Silver",      emoji: "🥈", css: "saturate(0%) contrast(130%) brightness(105%)",                                                                                 category: "cinematic" },

  // ── RETRO ─────────────────────────────────────────────────────────
  { id: "retro1",      name: "Sepia",       emoji: "🟫", css: "sepia(90%)",                                                                                                    category: "retro" },
  { id: "retro2",      name: "Retro",       emoji: "📼", css: "sepia(55%) saturate(180%) hue-rotate(-15deg) contrast(110%)",                                                   category: "retro" },
  { id: "retro3",      name: "Vintage",     emoji: "🕰️", css: "sepia(40%) hue-rotate(-10deg) saturate(140%) contrast(105%) brightness(105%)",                                  category: "retro" },
  { id: "retro4",      name: "Kodak Gold",  emoji: "📷", css: "sepia(48%) saturate(165%) hue-rotate(-17deg) contrast(110%) brightness(110%)",                                  category: "retro" },
  { id: "retro5",      name: "70s Film",    emoji: "🎞", css: "sepia(62%) saturate(200%) hue-rotate(-20deg) contrast(108%) brightness(98%)",                                   category: "retro" },
  { id: "retro6",      name: "Faded",       emoji: "🌫", css: "brightness(128%) contrast(72%) saturate(70%) sepia(25%)",                                                       category: "retro" },
  { id: "retro7",      name: "Super8",      emoji: "🎥", css: "sepia(35%) saturate(155%) contrast(115%) brightness(92%) hue-rotate(-18deg)",                                   category: "retro" },
  { id: "retro8",      name: "Polaroid",    emoji: "📸", css: "contrast(82%) brightness(118%) saturate(108%) sepia(18%)",                                                      category: "retro" },
  { id: "retro9",      name: "Chrome",      emoji: "💿", css: "saturate(0%) contrast(120%) brightness(110%)",                                                                  category: "retro" },
  { id: "retro10",     name: "B&W Grit",    emoji: "⬛", css: "grayscale(100%) contrast(175%) brightness(82%)",                                                                category: "retro" },
  { id: "retro11",     name: "90s TV",      emoji: "📺", css: "saturate(145%) contrast(122%) brightness(96%) sepia(30%) hue-rotate(-12deg)",                                                  category: "retro" },
  { id: "retro12",     name: "Film Grain",  emoji: "🎞️", css: "contrast(108%) brightness(98%) saturate(88%) sepia(12%)",                                                                      category: "retro" },
  { id: "retro13",     name: "Cassette",    emoji: "📻", css: "sepia(72%) saturate(160%) hue-rotate(-22deg) contrast(115%) brightness(92%)",                                                  category: "retro" },
  { id: "retro14",     name: "Slide Film",  emoji: "🎯", css: "saturate(195%) contrast(130%) brightness(88%) hue-rotate(-8deg) sepia(15%)",                                                   category: "retro" },
  { id: "retro15",     name: "Daguerrotype",emoji: "🪞", css: "grayscale(100%) sepia(50%) contrast(140%) brightness(88%)",                                                                    category: "retro" },

  // ── CYBERPUNK ─────────────────────────────────────────────────────
  { id: "cyber1",      name: "Cyberpunk",   emoji: "🤖", css: "saturate(260%) contrast(145%) brightness(88%) hue-rotate(182deg)",                                              category: "cyberpunk" },
  { id: "cyber2",      name: "Neon City",   emoji: "🌃", css: "saturate(360%) contrast(132%) brightness(83%) hue-rotate(122deg)",                                              category: "cyberpunk" },
  { id: "cyber3",      name: "Electric",    emoji: "⚡", css: "saturate(320%) contrast(155%) brightness(78%) hue-rotate(200deg)",                                              category: "cyberpunk" },
  { id: "cyber4",      name: "Synthwave",   emoji: "🌆", css: "hue-rotate(278deg) saturate(280%) contrast(130%) brightness(82%)",                                              category: "cyberpunk" },
  { id: "cyber5",      name: "Glitch Neon", emoji: "💥", css: "saturate(400%) contrast(160%) brightness(80%) hue-rotate(240deg)",                                              category: "cyberpunk" },
  { id: "cyber6",      name: "Matrix",      emoji: "💚", css: "saturate(0%) contrast(150%) brightness(75%) sepia(100%) hue-rotate(85deg) saturate(400%)",                     category: "cyberpunk" },
  { id: "cyber7",      name: "Vapor",       emoji: "🌸", css: "hue-rotate(300deg) saturate(240%) contrast(118%) brightness(90%)",                                              category: "cyberpunk" },
  { id: "cyber8",      name: "Hologram",    emoji: "🔷", css: "hue-rotate(185deg) saturate(320%) contrast(125%) brightness(85%) sepia(10%)",                                   category: "cyberpunk" },
  { id: "cyber9",      name: "Acid",        emoji: "🧪", css: "saturate(500%) contrast(155%) brightness(82%) hue-rotate(88deg)",                                                               category: "cyberpunk" },
  { id: "cyber10",     name: "Ultraviolet", emoji: "🟣", css: "hue-rotate(260deg) saturate(380%) contrast(138%) brightness(76%)",                                                              category: "cyberpunk" },
  { id: "cyber11",     name: "Hack",        emoji: "👾", css: "saturate(0%) contrast(200%) brightness(68%) sepia(100%) hue-rotate(90deg) saturate(500%)",                                     category: "cyberpunk" },
  { id: "cyber12",     name: "Rave",        emoji: "🎉", css: "saturate(420%) contrast(148%) brightness(88%) hue-rotate(310deg)",                                                              category: "cyberpunk" },

  // ── NATURE ────────────────────────────────────────────────────────
  { id: "nature1",     name: "Forest",      emoji: "🌲", css: "hue-rotate(90deg) saturate(180%) contrast(110%) brightness(90%)",                                               category: "nature" },
  { id: "nature2",     name: "Sunset",      emoji: "🌅", css: "sepia(20%) saturate(250%) hue-rotate(-30deg) brightness(110%) contrast(105%)",                                  category: "nature" },
  { id: "nature3",     name: "Ocean",       emoji: "🌊", css: "hue-rotate(195deg) saturate(130%) brightness(105%)",                                                            category: "nature" },
  { id: "nature4",     name: "Golden Hr",   emoji: "🌄", css: "sepia(30%) saturate(200%) hue-rotate(-22deg) brightness(115%)",                                                 category: "nature" },
  { id: "nature5",     name: "Arctic",      emoji: "🧊", css: "hue-rotate(210deg) saturate(80%) brightness(115%) contrast(90%)",                                               category: "nature" },
  { id: "nature6",     name: "Desert",      emoji: "🏜️", css: "sepia(28%) saturate(185%) hue-rotate(-28deg) contrast(112%) brightness(108%)",                                  category: "nature" },
  { id: "nature7",     name: "Jungle",      emoji: "🦎", css: "hue-rotate(102deg) saturate(210%) contrast(118%) brightness(85%)",                                              category: "nature" },
  { id: "nature8",     name: "Cherry Blosm",emoji: "🌸", css: "saturate(150%) brightness(120%) contrast(82%) sepia(12%) hue-rotate(-14deg)",                                   category: "nature" },
  { id: "nature9",     name: "Rain",        emoji: "🌧️", css: "hue-rotate(205deg) saturate(110%) brightness(88%) contrast(115%)",                                                               category: "nature" },
  { id: "nature10",    name: "Volcano",     emoji: "🌋", css: "saturate(300%) contrast(148%) brightness(85%) hue-rotate(-38deg) sepia(22%)",                                                  category: "nature" },
  { id: "nature11",    name: "Foggy Morn",  emoji: "🌫️", css: "brightness(120%) contrast(65%) saturate(75%) blur(0.5px)",                                                                      category: "nature" },
  { id: "nature12",    name: "Deep Sea",    emoji: "🐋", css: "hue-rotate(210deg) saturate(180%) contrast(122%) brightness(72%)",                                                              category: "nature" },

  // ── PORTRAIT ──────────────────────────────────────────────────────
  { id: "port1",       name: "Glow Skin",   emoji: "✨", css: "brightness(115%) contrast(88%) saturate(140%) sepia(8%)",                                                       category: "portrait" },
  { id: "port2",       name: "Soft Beauty", emoji: "💄", css: "brightness(122%) contrast(80%) saturate(130%) blur(0.2px)",                                                     category: "portrait" },
  { id: "port3",       name: "Warm Tone",   emoji: "🔥", css: "sepia(35%) saturate(160%) hue-rotate(-25deg) brightness(110%)",                                                 category: "portrait" },
  { id: "port4",       name: "Cool Skin",   emoji: "❄️", css: "hue-rotate(192deg) saturate(120%) brightness(108%) contrast(88%)",                                              category: "portrait" },
  { id: "port5",       name: "Vivid",       emoji: "💥", css: "saturate(220%) contrast(115%) brightness(105%)",                                                                category: "portrait" },
  { id: "port6",       name: "Pastel",      emoji: "🌸", css: "saturate(145%) brightness(122%) contrast(78%) sepia(8%)",                                                       category: "portrait" },
  { id: "port7",       name: "Dreamy",      emoji: "💭", css: "brightness(120%) contrast(80%) saturate(120%) blur(0.4px)",                                                     category: "portrait" },
  { id: "port8",       name: "High Key",    emoji: "☀️", css: "brightness(140%) contrast(72%) saturate(105%)",                                                                  category: "portrait" },
  { id: "port9",       name: "Amber Glow",  emoji: "🟡", css: "sepia(40%) saturate(180%) hue-rotate(-30deg) brightness(115%) contrast(92%)",                                                  category: "portrait" },
  { id: "port10",      name: "Moody Low",   emoji: "🌙", css: "brightness(78%) contrast(135%) saturate(120%) hue-rotate(192deg)",                                                             category: "portrait" },
  { id: "port11",      name: "Peach Skin",  emoji: "🍑", css: "sepia(18%) saturate(165%) brightness(118%) contrast(82%) hue-rotate(-18deg)",                                                  category: "portrait" },
  { id: "port12",      name: "Matte Skin",  emoji: "🤍", css: "contrast(78%) brightness(112%) saturate(88%) sepia(5%)",                                                                       category: "portrait" },

  // ── GLITCH ────────────────────────────────────────────────────────
  { id: "glitch1",     name: "VHS",         emoji: "📼", css: "saturate(115%) contrast(118%) brightness(93%) sepia(22%) hue-rotate(-8deg)",                                    category: "glitch" },
  { id: "glitch2",     name: "Scan Lines",  emoji: "📺", css: "contrast(140%) brightness(85%) saturate(90%)",                                                                  category: "glitch" },
  { id: "glitch3",     name: "RGB Split",   emoji: "🌈", css: "saturate(260%) contrast(145%) brightness(88%) hue-rotate(182deg)",                                              category: "glitch" },
  { id: "glitch4",     name: "Corrupt",     emoji: "💔", css: "contrast(200%) saturate(0%) brightness(60%) invert(15%)",                                                       category: "glitch" },
  { id: "glitch5",     name: "Pixel Burn",  emoji: "🔴", css: "contrast(180%) saturate(350%) brightness(72%) hue-rotate(-10deg)",                                              category: "glitch" },
  { id: "glitch6",     name: "Y2K",         emoji: "💾", css: "saturate(190%) contrast(128%) hue-rotate(175deg) brightness(90%)",                                              category: "glitch" },
  { id: "glitch7",     name: "Overdrive",   emoji: "🔊", css: "contrast(220%) saturate(200%) brightness(70%) hue-rotate(190deg)",                                              category: "glitch" },
  { id: "glitch8",     name: "Broken LCD",  emoji: "🖥️", css: "contrast(175%) brightness(82%) saturate(230%) hue-rotate(165deg)",                                                              category: "glitch" },
  { id: "glitch9",     name: "CRT Burn",    emoji: "🟥", css: "contrast(160%) saturate(320%) brightness(78%) hue-rotate(-30deg)",                                                               category: "glitch" },
  { id: "glitch10",    name: "Datastream",  emoji: "📡", css: "saturate(0%) contrast(185%) brightness(72%) sepia(100%) hue-rotate(95deg) saturate(450%)",                                     category: "glitch" },
  { id: "glitch11",    name: "Static",      emoji: "📶", css: "contrast(195%) saturate(0%) brightness(65%)",                                                                                   category: "glitch" },
  { id: "glitch12",    name: "Flicker",     emoji: "⚡", css: "contrast(155%) saturate(180%) brightness(85%) hue-rotate(200deg) sepia(8%)",                                                    category: "glitch" },

  // ── MOOD ──────────────────────────────────────────────────────────
  { id: "mood1",       name: "Sad Blue",    emoji: "💙", css: "hue-rotate(200deg) saturate(160%) contrast(108%) brightness(88%)",                                              category: "mood" },
  { id: "mood2",       name: "Romantic",    emoji: "💕", css: "saturate(175%) brightness(118%) contrast(92%) sepia(22%) hue-rotate(-22deg)",                                   category: "mood" },
  { id: "mood3",       name: "Euphoria",    emoji: "🌈", css: "saturate(310%) contrast(120%) brightness(105%) hue-rotate(20deg)",                                              category: "mood" },
  { id: "mood4",       name: "Melancholy",  emoji: "🌧", css: "saturate(55%) contrast(122%) brightness(78%) sepia(15%) hue-rotate(190deg)",                                    category: "mood" },
  { id: "mood5",       name: "Rage",        emoji: "😤", css: "saturate(310%) contrast(148%) brightness(93%) hue-rotate(-32deg)",                                              category: "mood" },
  { id: "mood6",       name: "Chill",       emoji: "😌", css: "saturate(120%) brightness(108%) contrast(88%) hue-rotate(155deg)",                                              category: "mood" },
  { id: "mood7",       name: "Happy",       emoji: "😊", css: "saturate(230%) brightness(115%) contrast(105%) hue-rotate(-10deg)",                                             category: "mood" },
  { id: "mood8",       name: "Cosmic",      emoji: "🌌", css: "hue-rotate(252deg) saturate(210%) contrast(135%) brightness(78%)",                                              category: "mood" },
  { id: "mood9",       name: "Jealousy",    emoji: "😒", css: "hue-rotate(108deg) saturate(145%) contrast(118%) brightness(85%)",                                                               category: "mood" },
  { id: "mood10",      name: "Nostalgia",   emoji: "💛", css: "sepia(55%) saturate(150%) hue-rotate(-15deg) brightness(108%) contrast(95%)",                                                   category: "mood" },
  { id: "mood11",      name: "Anxious",     emoji: "😰", css: "saturate(62%) contrast(142%) brightness(82%) sepia(10%) hue-rotate(180deg)",                                                    category: "mood" },
  { id: "mood12",      name: "Power",       emoji: "💪", css: "saturate(280%) contrast(152%) brightness(88%) hue-rotate(-22deg)",                                                              category: "mood" },

  // ── DESI ──────────────────────────────────────────────────────────
  { id: "desi1",       name: "Bollywood",   emoji: "🎪", css: "saturate(210%) contrast(118%) brightness(110%) sepia(18%) hue-rotate(-12deg)",                                  category: "desi" },
  { id: "desi2",       name: "KGF Dark",    emoji: "👑", css: "contrast(170%) saturate(75%) brightness(72%) sepia(45%) hue-rotate(-8deg)",                                     category: "desi" },
  { id: "desi3",       name: "RRR Epic",    emoji: "⚔️", css: "contrast(150%) saturate(140%) brightness(88%) hue-rotate(-20deg) sepia(10%)",                                  category: "desi" },
  { id: "desi4",       name: "Pushpa Gritty",emoji:"🌿", css: "saturate(130%) contrast(155%) brightness(82%) sepia(30%) hue-rotate(15deg)",                                    category: "desi" },
  { id: "desi5",       name: "Anime+",      emoji: "🇯🇵", css: "saturate(290%) contrast(122%) brightness(118%) hue-rotate(6deg)",                                              category: "desi" },
  { id: "desi6",       name: "Kabir Singh", emoji: "🥃", css: "contrast(142%) saturate(95%) brightness(80%) sepia(35%) hue-rotate(-5deg)",                                     category: "desi" },
  { id: "desi7",       name: "Pathaan",     emoji: "🕶️", css: "contrast(138%) saturate(110%) brightness(82%) hue-rotate(12deg) sepia(12%)",                                   category: "desi" },
  { id: "desi8",       name: "Bhojpuri",    emoji: "🎵", css: "saturate(200%) contrast(120%) brightness(108%) sepia(22%) hue-rotate(-18deg)",                                  category: "desi" },
  { id: "desi9",       name: "Jawan",       emoji: "🎖️", css: "contrast(145%) saturate(88%) brightness(80%) sepia(28%) hue-rotate(-10deg)",                                                   category: "desi" },
  { id: "desi10",      name: "Animal",      emoji: "🐅", css: "contrast(162%) saturate(105%) brightness(76%) sepia(40%) hue-rotate(-5deg)",                                                    category: "desi" },
  { id: "desi11",      name: "Stree",       emoji: "👻", css: "saturate(68%) contrast(132%) brightness(78%) sepia(20%) hue-rotate(190deg)",                                                    category: "desi" },
  { id: "desi12",      name: "War",         emoji: "💣", css: "contrast(155%) saturate(92%) brightness(82%) sepia(25%) hue-rotate(8deg)",                                                      category: "desi" },
  { id: "desi13",      name: "Gangubai",    emoji: "🌹", css: "saturate(88%) contrast(148%) brightness(80%) sepia(48%) hue-rotate(-15deg)",                                                    category: "desi" },
  { id: "desi14",      name: "Brahmastra",  emoji: "🔱", css: "saturate(260%) contrast(138%) brightness(82%) hue-rotate(252deg) sepia(15%)",                                                   category: "desi" },
  { id: "desi15",      name: "Kalki 2898",  emoji: "🚀", css: "saturate(195%) contrast(150%) brightness(78%) hue-rotate(188deg) sepia(8%)",                                                    category: "desi" },
  { id: "desi16",      name: "GOW",         emoji: "⚡", css: "saturate(155%) contrast(165%) brightness(75%) sepia(35%) hue-rotate(-18deg)",                                                   category: "desi" },
];

/* ── Aura Presets ──────────────────────────────────────────── */
export interface AuraPreset {
  id: string;
  name: string;
  emoji: string;
  color: string;
  intensity: number;
  pulse: boolean;
  rainbow?: boolean;
  description: string;
}

export const AURA_PRESETS: AuraPreset[] = [
  { id: "gold",     name: "Gold Aura",     emoji: "✨", color: "#ffd700", intensity: 28, pulse: false, description: "Rich gold royal glow" },
  { id: "fire",     name: "Fire Aura",     emoji: "🔥", color: "#ff4400", intensity: 32, pulse: true,  description: "Blazing fire pulse" },
  { id: "ice",      name: "Ice Aura",      emoji: "❄️", color: "#00cfff", intensity: 24, pulse: false, description: "Cool crystal glow" },
  { id: "neon",     name: "Neon Aura",     emoji: "🌈", color: "#ff00ff", intensity: 30, pulse: true,  description: "Electric neon pulse" },
  { id: "cosmic",   name: "Cosmic Aura",   emoji: "🌌", color: "#8800ff", intensity: 36, pulse: true,  description: "Deep space energy" },
  { id: "toxic",    name: "Toxic Aura",    emoji: "☢️", color: "#00ff44", intensity: 28, pulse: true,  description: "Radioactive green" },
  { id: "rose",     name: "Rose Aura",     emoji: "🌹", color: "#ff69b4", intensity: 22, pulse: false, description: "Soft romantic pink" },
  { id: "electric", name: "Electric Aura", emoji: "⚡", color: "#ffffaa", intensity: 40, pulse: true,  description: "Raw electric power" },
  { id: "blood",    name: "Blood Aura",    emoji: "🩸", color: "#cc0000", intensity: 30, pulse: true,  description: "Intense red energy" },
  { id: "rainbow",  name: "Rainbow Aura",  emoji: "🌈", color: "#ffd700", intensity: 28, pulse: true,  rainbow: true, description: "Auto-cycling rainbow" },
];

/* ── Smart Caption Emoji Map ────────────────────────────────── */
export const CAPTION_EMOJI_MAP: Record<string, string> = {
  // Emotion
  love: "❤️", fire: "🔥", wow: "😮", amazing: "🤩", great: "👍",
  awesome: "🔥", beautiful: "✨", epic: "⚡", crazy: "😱", funny: "😂",
  sad: "😢", happy: "😊", angry: "😤", scared: "😰", excited: "🎉",
  // Actions
  run: "🏃", dance: "💃", sing: "🎤", eat: "🍴", drink: "🥤",
  win: "🏆", lose: "💔", fight: "👊", jump: "⬆️", fly: "✈️",
  // Nature
  sun: "☀️", rain: "🌧", snow: "❄️", night: "🌙", day: "🌅",
  // Common expressions
  hello: "👋", bye: "👋", yes: "✅", no: "❌", ok: "👌",
  money: "💰", game: "🎮", music: "🎵", food: "🍕", car: "🚗",
  phone: "📱", camera: "📷", work: "💼", home: "🏠", school: "📚",
  // Reactions
  bro: "🫂", dude: "😎", king: "👑", queen: "👸", boss: "💪",
};

/* ── Legacy FILTERS (kept for backward compat) ──────────────── */
export const FILTERS: VideoFilter[] = [
  { id: "none",      name: "Original",  emoji: "🎞️", css: "none" },
  { id: "bw",        name: "B&W",       emoji: "⬛", css: "grayscale(100%)" },
  { id: "sepia",     name: "Sepia",     emoji: "🟫", css: "sepia(90%)" },
  { id: "vivid",     name: "Vivid",     emoji: "💥", css: "saturate(220%) contrast(115%) brightness(105%)" },
  { id: "cinematic", name: "Cinematic", emoji: "🎬", css: "contrast(130%) saturate(70%) sepia(25%) brightness(90%)" },
  { id: "retro",     name: "Retro",     emoji: "📼", css: "sepia(55%) saturate(180%) hue-rotate(-15deg) contrast(110%)" },
  { id: "gloom",     name: "Gloom",     emoji: "🌑", css: "brightness(65%) contrast(130%) saturate(40%) sepia(10%)" },
  { id: "cool",      name: "Cool",      emoji: "❄️", css: "hue-rotate(195deg) saturate(130%) brightness(105%)" },
  { id: "warm",      name: "Warm",      emoji: "🔥", css: "sepia(35%) saturate(160%) hue-rotate(-25deg) brightness(110%)" },
  { id: "fade",      name: "Fade",      emoji: "🌫️", css: "brightness(130%) contrast(75%) saturate(75%)" },
  { id: "matte",     name: "Matte",     emoji: "🎨", css: "contrast(90%) brightness(105%) saturate(85%)" },
  { id: "chrome",    name: "Chrome",    emoji: "💿", css: "saturate(0%) contrast(120%) brightness(110%)" },
  { id: "invert",    name: "Invert",    emoji: "🔀", css: "invert(100%)" },
  { id: "neon",      name: "Neon",      emoji: "🌈", css: "saturate(300%) contrast(150%) brightness(80%) hue-rotate(45deg)" },
  { id: "golden",    name: "Golden",    emoji: "✨", css: "sepia(80%) saturate(300%) hue-rotate(-20deg) brightness(105%)" },
  { id: "teal",      name: "Teal",      emoji: "🌊", css: "hue-rotate(150deg) saturate(150%) contrast(110%)" },
  { id: "dramatic",  name: "Dramatic",  emoji: "🎭", css: "contrast(160%) saturate(50%) brightness(80%)" },
  { id: "dreamy",    name: "Dreamy",    emoji: "💭", css: "brightness(120%) contrast(80%) saturate(120%) blur(0.4px)" },
  { id: "vintage",   name: "Vintage",   emoji: "🕰️", css: "sepia(40%) hue-rotate(-10deg) saturate(140%) contrast(105%) brightness(105%)" },
  { id: "arctic",    name: "Arctic",    emoji: "🧊", css: "hue-rotate(210deg) saturate(80%) brightness(115%) contrast(90%)" },
  { id: "sunset",    name: "Sunset",    emoji: "🌅", css: "sepia(20%) saturate(250%) hue-rotate(-30deg) brightness(110%) contrast(105%)" },
  { id: "forest",    name: "Forest",    emoji: "🌲", css: "hue-rotate(90deg) saturate(180%) contrast(110%) brightness(90%)" },
  { id: "noir",      name: "Noir",      emoji: "🎩", css: "grayscale(100%) contrast(160%) brightness(80%)" },
  { id: "pastel",    name: "Pastel",    emoji: "🌸", css: "saturate(150%) brightness(120%) contrast(80%) sepia(10%)" },
];

export const TRANSITIONS: Transition[] = [
  { id: "none",      name: "Cut",       emoji: "✂️",  description: "Instant cut between clips" },
  { id: "fade",      name: "Fade",      emoji: "⚫",  description: "Fade to black and back" },
  { id: "dissolve",  name: "Dissolve",  emoji: "🌀",  description: "Cross dissolve between clips" },
  { id: "zoom",      name: "Zoom",      emoji: "🔍",  description: "Punch in zoom transition" },
  { id: "glitch",    name: "Glitch",    emoji: "⚡",  description: "Digital glitch effect" },
  { id: "blur",      name: "Blur",      emoji: "💨",  description: "Blur wipe transition" },
  { id: "slide",     name: "Slide",     emoji: "➡️",  description: "Horizontal slide" },
  { id: "flash",     name: "Flash",     emoji: "💡",  description: "White flash" },
];

export const MUSIC_TRACKS: MusicTrack[] = [
  { id: "m1",  title: "Golden Hour",     artist: "LoFi Beats",     duration: "3:24", category: "Trending",   bpm: 90,  tags: ["chill","lofi","ambient"] },
  { id: "m2",  title: "Summer Nights",   artist: "ChillWave",      duration: "2:58", category: "Trending",   bpm: 105, tags: ["pop","upbeat","summer"] },
  { id: "m3",  title: "Epic Rise",       artist: "CinemaFX",       duration: "1:45", category: "Trending",   bpm: 130, tags: ["epic","cinematic","rise"] },
  { id: "m4",  title: "Neon Dreams",     artist: "SynthCity",      duration: "3:12", category: "Trending",   bpm: 120, tags: ["synth","retro","neon"] },
  { id: "m5",  title: "Dark Horizon",    artist: "OrchestraFX",    duration: "2:32", category: "Cinematic",  bpm: 75,  tags: ["dark","dramatic","strings"] },
  { id: "m6",  title: "Hero Moment",     artist: "EpicScore",      duration: "2:48", category: "Cinematic",  bpm: 88,  tags: ["hero","inspiring","brass"] },
  { id: "m9",  title: "Street Vibe",     artist: "BeatMaker",      duration: "2:14", category: "Hip Hop",    bpm: 95,  tags: ["hiphop","trap","beat"] },
  { id: "m13", title: "Deep Space",      artist: "SpaceAudio",     duration: "4:12", category: "Ambient",    bpm: 60,  tags: ["ambient","space","calm"] },
];

export const FONT_OPTIONS = [
  { id: "sans",    name: "Sans",    style: "Inter, sans-serif" },
  { id: "serif",   name: "Serif",   style: "Georgia, serif" },
  { id: "mono",    name: "Mono",    style: "Menlo, monospace" },
  { id: "cursive", name: "Cursive", style: "cursive" },
  { id: "impact",  name: "Impact",  style: "Impact, fantasy" },
  { id: "bold",    name: "Bold",    style: "'Arial Black', Arial, sans-serif" },
];

export const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export const NEXT_LEVEL_FILTERS: NextFilter[] = [
  { id: "bollywood", name: "Bollywood", emoji: "🎪", css: "saturate(210%) contrast(118%) brightness(110%) sepia(18%) hue-rotate(-12deg)", blendColor: "rgba(255,110,0,0.09)", glowColor: "#ff7a00", glowPx: 18 },
  { id: "kgf",       name: "KGF Dark",  emoji: "👑", css: "contrast(170%) saturate(75%) brightness(72%) sepia(45%) hue-rotate(-8deg)",    blendColor: "rgba(255,200,0,0.13)", glowColor: "#ffd700", glowPx: 28 },
  { id: "rrr",       name: "RRR Epic",  emoji: "⚔️", css: "contrast(150%) saturate(140%) brightness(88%) hue-rotate(-20deg) sepia(10%)", blendColor: "rgba(200,80,0,0.10)",  glowColor: "#ff4400", glowPx: 22 },
  { id: "romantic",  name: "Romantic",  emoji: "💕", css: "saturate(175%) brightness(118%) contrast(92%) sepia(22%) hue-rotate(-22deg)", blendColor: "rgba(255,90,160,0.10)",glowColor: "#ff69b4", glowPx: 20 },
  { id: "cyberpunk", name: "Cyberpunk", emoji: "🤖", css: "saturate(260%) contrast(145%) brightness(88%) hue-rotate(182deg)",             blendColor: "rgba(0,255,255,0.07)", glowColor: "#00ffff", glowPx: 32, canvasMode: "rgb-split" },
  { id: "vhs_glitch",name: "VHS",       emoji: "📼", css: "saturate(115%) contrast(118%) brightness(93%) sepia(22%) hue-rotate(-8deg)",   blendColor: "rgba(0,255,0,0.04)",   glowColor: "#00ff44", glowPx: 10, canvasMode: "vhs" },
  { id: "anime",     name: "Anime+",    emoji: "✨", css: "saturate(290%) contrast(122%) brightness(118%) hue-rotate(6deg)",               blendColor: "rgba(200,100,255,0.07)",glowColor: "#cc66ff",glowPx: 22, canvasMode: "neon-bloom" },
  { id: "cosmic",    name: "Cosmic",    emoji: "🌌", css: "hue-rotate(252deg) saturate(210%) contrast(135%) brightness(78%)",              blendColor: "rgba(100,0,255,0.13)", glowColor: "#8800ff", glowPx: 36, canvasMode: "neon-bloom" },
  { id: "fire_king", name: "Fire King", emoji: "🔥", css: "saturate(310%) contrast(148%) brightness(93%) hue-rotate(-32deg)",              blendColor: "rgba(255,50,0,0.11)",  glowColor: "#ff3300", glowPx: 26 },
  { id: "neon_city", name: "Neon City", emoji: "🌃", css: "saturate(360%) contrast(132%) brightness(83%) hue-rotate(122deg)",              blendColor: "rgba(255,0,255,0.09)", glowColor: "#ff00ff", glowPx: 32, canvasMode: "scanlines" },
  { id: "kodak",     name: "Kodak Gold",emoji: "📷", css: "sepia(48%) saturate(165%) hue-rotate(-17deg) contrast(110%) brightness(110%)", blendColor: "rgba(240,195,140,0.09)",glowColor: "#f0c38e",glowPx: 12 },
  { id: "pushpa",    name: "Pushpa Gritty",emoji:"🌿",css:"saturate(130%) contrast(155%) brightness(82%) sepia(30%) hue-rotate(15deg)",  blendColor: "rgba(60,120,20,0.09)",  glowColor: "#4a8822", glowPx: 16 },
];

export const EXPORT_PRESETS = [
  { id: "720p",  label: "720p HD",   width: 1280, height: 720,  bitrate: 5_000_000 },
  { id: "1080p", label: "1080p FHD", width: 1920, height: 1080, bitrate: 10_000_000 },
  { id: "4k",    label: "4K UHD",    width: 3840, height: 2160, bitrate: 30_000_000 },
];

export function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  const ms = Math.floor((secs % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
}

export function lerpKeyframe(keyframes: Keyframe[], time: number) {
  if (keyframes.length === 0) return null;
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (time <= sorted[0].time) return sorted[0];
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1];
    if (time >= a.time && time <= b.time) {
      const t = (time - a.time) / (b.time - a.time);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      return {
        x: a.x + ease * (b.x - a.x),
        y: a.y + ease * (b.y - a.y),
        opacity: a.opacity + ease * (b.opacity - a.opacity),
        scale: a.scale + ease * (b.scale - a.scale),
        rotation: a.rotation + ease * (b.rotation - a.rotation),
      };
    }
  }
  return sorted[sorted.length - 1];
}

export function previewTone(audioCtx: AudioContext, frequency = 440, duration = 0.3, type: OscillatorType = "sine") {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + duration);
}

/** Inject emoji into caption text based on keyword matching */
export function enrichCaptionWithEmoji(text: string): string {
  const lower = text.toLowerCase();
  const emojis: string[] = [];
  for (const [word, emoji] of Object.entries(CAPTION_EMOJI_MAP)) {
    if (lower.includes(word) && !emojis.includes(emoji)) emojis.push(emoji);
    if (emojis.length >= 2) break;
  }
  return emojis.length > 0 ? `${text} ${emojis.join("")}` : text;
}
