export type HydrationMessage = {
  quote: string;
  sub: string;
};

export const HYDRATION_MESSAGES: HydrationMessage[] = [
  { quote: "A sip for you is a win for both of us.", sub: "Keep flowing, you're doing great!" },
  { quote: "Water you waiting for?", sub: "Go on, take a sip." },
  { quote: "Your body is about 60% water — top it up.", sub: "Every glass counts." },
  { quote: "Hydration is self-care in its simplest form.", sub: "One sip at a time." },
  { quote: "Fun fact: your brain is roughly 75% water.", sub: "Keep it sharp, stay hydrated." },
  { quote: "Being thirsty is your body's way of saying help.", sub: "Listen to it." },
  { quote: "Water: the original energy drink.", sub: "Zero sugar, all benefits." },
  { quote: "Drink water like it's your job.", sub: "Because staying alive kind of is." },
  { quote: "Every cell in your body throws a tiny party when you hydrate.", sub: "Invite them more often." },
  { quote: "Even mild dehydration can affect your mood and focus.", sub: "Sip smarter, feel better." },
  { quote: "Water is the driving force of all nature.", sub: "— Leonardo da Vinci" },
  { quote: "H2-Oh yeah, that's the good stuff.", sub: "Drink up." },
  { quote: "You're probably not tired, you're thirsty.", sub: "Try water before coffee." },
  { quote: "Fill your own cup before you pour into others.", sub: "Literally, right now." },
  { quote: "Water has zero calories but real superpowers.", sub: "Flush, glow, repeat." },
  { quote: "Even 1–2% dehydration can hurt your performance.", sub: "Stay ahead of it." },
  { quote: "Ice, ice, baby — or just water, either way.", sub: "Stay cool, stay hydrated." },
  { quote: "Thirsty for success? Start with water.", sub: "Small habits, big wins." },
  { quote: "Water is life's matter and matrix, mother and medium.", sub: "— Albert Szent-Györgyi" },
  { quote: "Your skin will thank you for this glass.", sub: "Glow starts from within." },
  { quote: "Be like a river — always flowing forward.", sub: "One sip, one step." },
  { quote: "Water: because coffee doesn't count.", sub: "Balance it out." },
  { quote: "Hydrated people make better decisions. Probably.", sub: "Drink first, decide later." },
  { quote: "Your heart pumps about 2,000 gallons of blood a day.", sub: "Keep the pipeline flowing." },
  { quote: "Champions hydrate. Legends refill.", sub: "Which one are you today?" },
  { quote: "No liquid has ever regretted being water.", sub: "Be more like water." },
  { quote: "A well-watered you is a well-watered us.", sub: "Team hydration, let's go." },
];

export function getRandomHydrationMessage(): HydrationMessage {
  const index = Math.floor(Math.random() * HYDRATION_MESSAGES.length);
  return HYDRATION_MESSAGES[index];
}
