export type EmojiCategory = {
  name: string;
  icon: string;
  emojis: { name: string; emoji: string }[];
};

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: "Smileys",
    icon: "😀",
    emojis: [
      { name: "grinning", emoji: "😀" },
      { name: "smile", emoji: "😄" },
      { name: "laughing", emoji: "😆" },
      { name: "joy", emoji: "😂" },
      { name: "rofl", emoji: "🤣" },
      { name: "wink", emoji: "😉" },
      { name: "blush", emoji: "😊" },
      { name: "heart_eyes", emoji: "😍" },
      { name: "kissing", emoji: "😘" },
      { name: "thinking", emoji: "🤔" },
      { name: "neutral", emoji: "😐" },
      { name: "unamused", emoji: "😒" },
      { name: "rolling_eyes", emoji: "🙄" },
      { name: "sweat_smile", emoji: "😅" },
      { name: "confused", emoji: "😕" },
      { name: "worried", emoji: "😟" },
      { name: "cry", emoji: "😢" },
      { name: "sob", emoji: "😭" },
      { name: "angry", emoji: "😠" },
      { name: "sunglasses", emoji: "😎" },
      { name: "nerd", emoji: "🤓" },
      { name: "zany", emoji: "🤪" },
      { name: "shushing", emoji: "🤫" },
      { name: "mind_blown", emoji: "🤯" },
    ],
  },
  {
    name: "Gestures",
    icon: "👍",
    emojis: [
      { name: "thumbsup", emoji: "👍" },
      { name: "thumbsdown", emoji: "👎" },
      { name: "clap", emoji: "👏" },
      { name: "wave", emoji: "👋" },
      { name: "raised_hands", emoji: "🙌" },
      { name: "pray", emoji: "🙏" },
      { name: "handshake", emoji: "🤝" },
      { name: "ok_hand", emoji: "👌" },
      { name: "point_up", emoji: "☝️" },
      { name: "muscle", emoji: "💪" },
      { name: "fist", emoji: "✊" },
      { name: "v", emoji: "✌️" },
      { name: "crossed_fingers", emoji: "🤞" },
      { name: "salute", emoji: "🫡" },
    ],
  },
  {
    name: "Hearts",
    icon: "❤️",
    emojis: [
      { name: "heart", emoji: "❤️" },
      { name: "orange_heart", emoji: "🧡" },
      { name: "yellow_heart", emoji: "💛" },
      { name: "green_heart", emoji: "💚" },
      { name: "blue_heart", emoji: "💙" },
      { name: "purple_heart", emoji: "💜" },
      { name: "sparkling_heart", emoji: "💖" },
      { name: "broken_heart", emoji: "💔" },
      { name: "fire", emoji: "🔥" },
      { name: "sparkles", emoji: "✨" },
      { name: "star", emoji: "⭐" },
      { name: "rainbow", emoji: "🌈" },
    ],
  },
  {
    name: "Celebration",
    icon: "🎉",
    emojis: [
      { name: "tada", emoji: "🎉" },
      { name: "confetti", emoji: "🎊" },
      { name: "balloon", emoji: "🎈" },
      { name: "trophy", emoji: "🏆" },
      { name: "medal", emoji: "🥇" },
      { name: "crown", emoji: "👑" },
      { name: "gift", emoji: "🎁" },
      { name: "party_popper", emoji: "🥳" },
      { name: "champagne", emoji: "🍾" },
      { name: "rocket", emoji: "🚀" },
      { name: "100", emoji: "💯" },
      { name: "gem", emoji: "💎" },
    ],
  },
  {
    name: "Objects",
    icon: "💡",
    emojis: [
      { name: "bulb", emoji: "💡" },
      { name: "book", emoji: "📖" },
      { name: "pencil", emoji: "✏️" },
      { name: "pin", emoji: "📌" },
      { name: "link", emoji: "🔗" },
      { name: "bell", emoji: "🔔" },
      { name: "clock", emoji: "⏰" },
      { name: "magnifying_glass", emoji: "🔍" },
      { name: "lock", emoji: "🔒" },
      { name: "key", emoji: "🔑" },
      { name: "hammer", emoji: "🔨" },
      { name: "gear", emoji: "⚙️" },
    ],
  },
  {
    name: "Nature",
    icon: "🌿",
    emojis: [
      { name: "sun", emoji: "☀️" },
      { name: "cloud", emoji: "☁️" },
      { name: "rain", emoji: "🌧️" },
      { name: "snow", emoji: "❄️" },
      { name: "leaf", emoji: "🍃" },
      { name: "flower", emoji: "🌸" },
      { name: "tree", emoji: "🌳" },
      { name: "ocean", emoji: "🌊" },
      { name: "dog", emoji: "🐕" },
      { name: "cat", emoji: "🐈" },
      { name: "butterfly", emoji: "🦋" },
      { name: "bee", emoji: "🐝" },
    ],
  },
  {
    name: "Food",
    icon: "🍕",
    emojis: [
      { name: "pizza", emoji: "🍕" },
      { name: "hamburger", emoji: "🍔" },
      { name: "taco", emoji: "🌮" },
      { name: "sushi", emoji: "🍣" },
      { name: "ramen", emoji: "🍜" },
      { name: "coffee", emoji: "☕" },
      { name: "beer", emoji: "🍺" },
      { name: "wine", emoji: "🍷" },
      { name: "cake", emoji: "🎂" },
      { name: "cookie", emoji: "🍪" },
      { name: "apple", emoji: "🍎" },
      { name: "avocado", emoji: "🥑" },
    ],
  },
];

export const ALL_EMOJIS = EMOJI_CATEGORIES.flatMap((c) => c.emojis);

export const EMOJI_NAME_MAP: Record<string, string> = Object.fromEntries(
  ALL_EMOJIS.map((e) => [e.name, e.emoji]),
);

export function searchEmojis(query: string): { name: string; emoji: string }[] {
  const lower = query.toLowerCase();
  return ALL_EMOJIS.filter((e) => e.name.includes(lower)).slice(0, 8);
}
