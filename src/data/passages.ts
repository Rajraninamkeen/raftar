import type { Lang } from "./exams";

const ENGLISH = [
  "Success in a typing test does not come from speed alone. It comes from a calm mind, steady fingers and a habit of daily practice. Sit straight, keep your wrists relaxed and let your eyes stay on the passage, not on the keyboard. When you make a mistake, do not panic. Keep your rhythm and move ahead with the next word. Every minute of focused practice makes your hands a little faster and your accuracy a little stronger. In a few days you will notice that common words flow without effort. On the day of the exam, trust your training, breathe slowly and type the way you have practised a hundred times before.",
  "India is a land of many languages, cultures and traditions. The work of public offices depends on people who can prepare letters, notes and records quickly and correctly. A clerk or an assistant handles hundreds of files every month, and each file must be typed with care. That is why most recruitment bodies conduct a skill test after the written examination. The test checks whether a candidate can type a given passage within a fixed time and with very few errors. Candidates who practise regularly on a computer, under the same rules as the real test, usually clear this stage with confidence and move closer to selection.",
  "A good plan turns a big goal into small daily tasks. If your exam is ten days away, you cannot afford to practise without direction. Begin with the basics, fix the keys that slow you down and then build speed step by step. Measure your progress at the end of every session and note the words that cause errors. Short and regular practice is better than one long session on the weekend. Take a full mock test in the last few days so that the timer and the screen feel familiar. When the plan is clear, the mind stays free, and a free mind types faster than a worried one.",
  "Indian Railways is one of the largest railway networks in the world. Every day it carries millions of passengers and a huge amount of goods across the country. Running such a system needs careful planning, timely maintenance and thousands of trained employees. Ticket booking, train enquiry and complaint handling have now moved to online platforms, which has made travel easier for common people. Behind every smooth journey there are staff members who check tracks, manage signals and keep records up to date. Their discipline and sense of duty keep the wheels of the nation moving through every season of the year.",
  "Digital services have changed the way citizens deal with the government. Many tasks that once required long queues can now be completed from a mobile phone. Certificates, pension records and land details are stored in electronic form and can be checked in a few minutes. This change has also increased the need for accurate data entry. A single wrong digit in an account number or a date of birth can delay important work for weeks. For this reason, departments look for employees who are fast as well as careful. Accuracy is not a small skill; it is the foundation of public trust in every office.",
  "Good health is the real wealth of a person. A balanced diet, enough sleep and regular exercise keep the body active and the mind alert. Students preparing for competitive examinations often ignore these simple habits and spend long hours sitting in one place. Over time this leads to tired eyes, a stiff neck and poor concentration. Taking a short break after every hour of study, drinking enough water and walking for some time each day can make a big difference. A fresh mind learns faster and remembers more. Remember that the goal is not only to clear an exam but also to stay fit for the work that follows.",
];

// Written without nukta letters so they type identically on Inscript and Remington GAIL.
const HINDI = [
  "किसी भी परीक्षा में सफलता केवल मेहनत से नहीं, बल्कि सही योजना से मिलती है। टंकण परीक्षा में गति के साथ शुद्धता भी उतनी ही आवश्यक है। प्रतिदिन निश्चित समय पर अभ्यास करने से उंगलियाँ अपने आप सही कुंजियों पर जाने लगती हैं। शुरुआत में धीरे टाइप करें और ध्यान रखें कि कोई गलती न हो। जब शुद्धता बन जाए, तब धीरे धीरे अपनी गति को तेज करें। परीक्षा से पहले कुछ पूरे अभ्यास परीक्षण अवश्य दें, ताकि समय और स्क्रीन दोनों आपके लिए परिचित हो जाएँ।",
  "भारत में सरकारी कार्यालयों का अधिकांश कार्य अब कंप्यूटर पर होता है। पत्र, आदेश, सूचना और रिपोर्ट को सही और समय पर तैयार करना एक लिपिक की मुख्य जिम्मेदारी है। इसी कारण अनेक भर्ती परीक्षाओं में लिखित परीक्षा के बाद कौशल परीक्षा ली जाती है। इसमें उम्मीदवार को निर्धारित समय में दिया गया अनुच्छेद टाइप करना होता है। जो उम्मीदवार नियमित अभ्यास करते हैं, वे इस चरण को आत्मविश्वास के साथ पार कर लेते हैं।",
  "अच्छी आदतें ही अच्छे परिणाम देती हैं। टाइप करते समय कमर सीधी रखें, कलाई को ढीला रखें और नजर स्क्रीन पर बनाए रखें। कीबोर्ड की ओर देखने की आदत गति को सबसे अधिक कम करती है। हर अभ्यास के बाद अपनी गलतियों को ध्यान से देखें और उन शब्दों को दोबारा टाइप करें। छोटे लेकिन नियमित सत्र, सप्ताह में एक लंबे सत्र से कहीं अधिक लाभ देते हैं। धैर्य रखें, क्योंकि हर दिन का अभ्यास आपको लक्ष्य के और करीब ले जाता है।",
  "भारतीय रेल देश की जीवन रेखा मानी जाती है। हर दिन लाखों यात्री इसके माध्यम से एक स्थान से दूसरे स्थान तक यात्रा करते हैं। रेल केवल यात्रा का साधन नहीं है, बल्कि इससे व्यापार और रोजगार को भी बल मिलता है। समय के साथ रेलवे ने आरक्षण, सूचना और सेवाओं के लिए आधुनिक तकनीक को अपनाया है। आज टिकट से लेकर शिकायत तक अनेक काम ऑनलाइन हो जाते हैं। इन सभी व्यवस्थाओं को चलाने के लिए कुशल और जिम्मेदार कर्मचारियों की आवश्यकता होती है।",
  "जल ही जीवन है, यह बात हम बचपन से सुनते आए हैं। फिर भी हम अक्सर पानी को व्यर्थ बहने देते हैं। गाँवों और शहरों में कई स्थानों पर गर्मी के दिनों में पानी की भारी कमी हो जाती है। वर्षा के जल को संचित करना, नल को बंद रखना और पुराने तालाबों को फिर से जीवित करना ऐसे उपाय हैं, जिन्हें हर नागरिक अपना सकता है। यदि हम आज से ही सावधानी बरतें, तो भविष्य में जल संकट से बचा जा सकता है।",
];

export const PASSAGES: Record<Lang, string[]> = {
  english: ENGLISH.map((p) => p.normalize("NFC")),
  hindi: HINDI.map((p) => p.normalize("NFC")),
};

/** Joins passages, starting at `start`, until the text is long enough for the chosen duration. */
export function buildText(lang: Lang, start: number, minLength: number): string {
  const list = PASSAGES[lang];
  const first = ((start % list.length) + list.length) % list.length;
  let text = list[first];
  for (let i = 1; text.length < minLength && i < list.length * 4; i++) {
    text += " " + list[(first + i) % list.length];
  }
  return text;
}

export function repeatTo(base: string, minLength: number): string {
  let text = base;
  while (text.length < minLength) text += " " + base;
  return text;
}

const PUNCT = /[.,;:!?।"'()]/g;

/** Builds a drill from real passage words that contain the given characters. */
export function buildDrill(lang: Lang, chars: string[], count = 60): string {
  const words = Array.from(
    new Set(
      PASSAGES[lang]
        .join(" ")
        .replace(PUNCT, "")
        .split(/\s+/)
        .filter(Boolean),
    ),
  );
  const wanted = chars.filter((c) => c.trim()).map((c) => c.toLowerCase());
  const hits = wanted.length ? words.filter((w) => wanted.some((c) => w.toLowerCase().includes(c))) : [];
  const pool = hits.length >= 8 ? hits : hits.length ? [...hits, ...hits, ...hits, ...words] : words;

  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    let w = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && w === out[out.length - 1]) w = pool[(pool.indexOf(w) + 1) % pool.length];
    out.push(w);
  }
  return out.join(" ");
}
