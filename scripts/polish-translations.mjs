#!/usr/bin/env node
/**
 * polish-translations.mjs — systematically cleans up translation flaws in Nepali and Hindi data files:
 * - Replaces colloquial/erroneous 'श्राप' with classical 'शाप' (शापित, शापमुक्त, etc.)
 * - Replaces crude literal animal words for divine avatars (बँदेल/सूअर -> वराह, माछा/मछली -> मत्स्य, कछुवा/कछुआ -> कूर्म, बौना/पुड्के -> वामन/बटुक)
 * - Replaces disrespectful colloquialisms like 'लात मार', 'ओछ्यान', 'जवानी', 'सापट दिए', 'बढई'
 * - Preserves exact schema, node count, and edge count.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'src/data/i18n');

function polishNepaliText(text) {
  let s = text;

  // Shrap -> Shaap
  s = s.replace(/श्राप/g, 'शाप');
  s = s.replace(/श्रापित/g, 'शापित');

  // Avatar respectful terminology
  s = s.replace(/बँदेल रूपी वराह/g, 'वराह अवतार');
  s = s.replace(/बँदेलको अवतार/g, 'वराह अवतार');
  s = s.replace(/बँदेल अवतार/g, 'वराह अवतार');
  s = s.replace(/बँदेल-मुख/g, 'वराह-मुख');
  s = s.replace(/बँदेलको टाउको/g, 'वराह-मुख');
  s = s.replace(/बँदेलको मुख/g, 'वराह-मुख');
  s = s.replace(/बँदेल बनेर/g, 'वराह रूप धारण गरेर');
  s = s.replace(/बँदेल बनी/g, 'वराह रूप लिई');
  s = s.replace(/माछा रूपी मत्स्य/g, 'मत्स्य अवतार');
  s = s.replace(/माछाको अवतार/g, 'मत्स्य अवतार');
  s = s.replace(/कछुवाको अवतार/g, 'कूर्म (कच्छप) अवतार');
  s = s.replace(/सृष्टिकर्ता-कछुवा \(कूर्म\)/g, 'सृष्टिकर्ता कूर्म');
  s = s.replace(/कछुवाको खोल/g, 'कूर्म-कवच');
  s = s.replace(/कछुवाको रूप लिन्छन्/g, 'कूर्म रूप धारण गर्दछन्');
  s = s.replace(/कछुवाको रूप लिई/g, 'कूर्म रूप धारण गरी');
  s = s.replace(/कछुवाको सहाराले/g, 'कूर्मको आधारले');
  s = s.replace(/विशाल कछुवा कूर्मको रूप/g, 'विशाल कूर्मको दिव्य रूप');
  s = s.replace(/विशाल कछुवा बनेर/g, 'विशाल कूर्म रूप लिई');
  s = s.replace(/बौना रूपी वामन/g, 'वामन अवतार');
  s = s.replace(/पुड्के अवतार/g, 'वामन अवतार');
  s = s.replace(/बौनाको अनुरोधबाट/g, 'बटुक वामनको छलबाट');
  s = s.replace(/बौना/g, 'वामन');

  // Other crude/disrespectful terms
  s = s.replace(/लात हाने/g, 'पादप्रहार गरे');
  s = s.replace(/लात हान्दा/g, 'पादप्रहार गर्दा');
  s = s.replace(/लात्ती हानेर/g, 'पादप्रहार गरेर');
  s = s.replace(/लात मार/g, 'पादप्रहार गर');
  s = s.replace(/थुलथुले पेट/g, 'विशाल उदर (लम्बोदर)');
  s = s.replace(/हाँस वा राजहंस/g, 'राजहंस (हंस)');
  s = s.replace(/बूढो बढईका वेशमा/g, 'वृद्ध शिल्पीका वेशमा');
  s = s.replace(/बढई/g, 'काष्ठकार');
  s = s.replace(/धन सापट दिए/g, 'ऋण प्रदान गरे');
  s = s.replace(/बिहेका लागि/g, 'विवाहका निमित्त');
  s = s.replace(/जवानी सापट लिए/g, 'छोरा पुरुको यौवन ग्रहण गरे');
  s = s.replace(/जवानी/g, 'यौवन');
  s = s.replace(/ओछ्यानमा नलाने/g, 'सहवास नगर्ने');
  s = s.replace(/ओछ्यानसहित/g, 'शय्यासहित');
  s = s.replace(/सुन्दर ओछ्यानमा/g, 'सुन्दर शय्यामा');
  s = s.replace(/आफ्नै ओछ्यानमा बसाए/g, 'आफ्नै सिंहासनमा बसाल्नुभयो');
  s = s.replace(/उफ्रेर अँगाले/g, 'हतारिएर अँगालो हाल्नुभयो');
  s = s.replace(/श्रीले असुर बलिलाई छोडेर इन्द्रसँग बस्न आइन्/g, 'माता लक्ष्मीले असुर बलिलाई त्यागेर इन्द्रको आश्रय लिनुभयो');
  s = s.replace(/सरस्वती कुम्भकर्णको वाणीमा पसेर उसले इन्द्रको सिंहासन होइन निद्रा माग्यो/g, 'सरस्वती कुम्भकर्णको जिब्रोमा विराजमान हुनुभएपछि उसले इन्द्रासनको सट्टा निद्रा माग्यो');

  return s;
}

function polishHindiText(text) {
  let s = text;

  // Avatar respectful terminology
  s = s.replace(/विष्णु के सूअर-अवतार/g, 'विष्णु के वराह-अवतार');
  s = s.replace(/सूअर-अवतार/g, 'वराह-अवतार');
  s = s.replace(/सूअर-मुखी/g, 'वराह-मुखी');
  s = s.replace(/सूअर का मुख/g, 'वराह-मुख');
  s = s.replace(/मत्स्य — मछली —/g, 'मत्स्य —');
  s = s.replace(/मछली स्वयं को ब्रह्मा प्रजापति प्रकट करती है/g, 'मत्स्य रूपी भगवान् स्वयं को ब्रह्मा प्रजापति प्रकट करते हैं');
  s = s.replace(/सींग वाली सुनहरी मछली/g, 'शृङ्गयुक्त स्वर्णिम मत्स्य');
  s = s.replace(/छाता लिए बौना ब्राह्मण बालक/g, 'छत्र एवं दण्ड धारण किए बटुक ब्राह्मण रूप');
  s = s.replace(/तत्क्षण बौना ब्रह्माण्ड-काय हो गया/g, 'तत्क्षण भगवान् वामन विराट त्रिविक्रम रूप में प्रकट हुए');
  s = s.replace(/बौना-रूप/g, 'वामन-रूप');

  // Kicking respectful literary phrases
  s = s.replace(/वक्ष पर लात मार दी/g, 'वक्षस्थल पर पाद-प्रहार किया');
  s = s.replace(/वक्ष पर लात मारते हैं/g, 'वक्षस्थल पर पाद-प्रहार करते हैं');
  s = s.replace(/वक्ष पर लात मारी/g, 'वक्षस्थल पर पाद-प्रहार किया');
  s = s.replace(/सिर पर लात मारी/g, 'मस्तक पर पाद-प्रहार किया');
  s = s.replace(/लात मारने पर/g, 'पाद-प्रहार करने पर');
  s = s.replace(/लात मारने के लिए/g, 'प्रहार करने के लिए');
  s = s.replace(/लात मारता है/g, 'पाद-प्रहार करता है');

  // Grammar fixes
  s = s.replace(/के संतान/g, 'की संतान');
  s = s.replace(/यौवन उधार लिया/g, 'यौवन ग्रहण किया');

  // Kumbhakarna edge
  s = s.replace(/सरस्वती कुम्भकर्ण की वाणी में समाईं, ताकि उन्होंने ब्रह्मा से इन्द्र के सिंहासन के बजाय निद्रा माँगी/g, 'सरस्वती कुम्भकर्ण की जिह्वा पर विराजमान हुईं, जिससे उसने इन्द्रासन के स्थान पर निद्रासन माँगा');

  return s;
}

// Special alias cleanups
function fixAliases(parsed, lang) {
  if (!parsed.nodes) return;
  for (const [id, n] of Object.entries(parsed.nodes)) {
    if (!Array.isArray(n.aliases)) continue;
    if (lang === 'ne') {
      if (id === 'matsya') n.aliases = n.aliases.map(a => a === 'माछा' ? 'महामत्स्य' : a);
      if (id === 'kurma') n.aliases = n.aliases.map(a => a === 'कछुवा' ? 'कच्छप' : a);
      if (id === 'varaha') n.aliases = n.aliases.map(a => a === 'बँदेल' ? 'शूकर' : a);
      if (id === 'vamana') n.aliases = n.aliases.map(a => (a === 'पुड्के' || a === 'बौना') ? 'बटुक' : a);
      if (id === 'hiranyagarbha') n.aliases = n.aliases.map(a => a === 'सुनौलो बीउ' ? 'स्वर्णबीज' : (a === 'सुनौलो गर्भ' ? 'स्वर्णिम गर्भ' : a));
      if (id === 'brahman') n.aliases = n.aliases.map(a => a === 'ब्रह्म (नपुंसकलिंगी)' ? 'परब्रह्म' : a);
    } else if (lang === 'hi') {
      if (id === 'matsya') n.aliases = n.aliases.map(a => a === 'मछली' ? 'महामत्स्य' : a);
      if (id === 'kurma') n.aliases = n.aliases.map(a => a === 'कछुआ' ? 'कच्छप' : a);
      if (id === 'varaha') n.aliases = n.aliases.map(a => a === 'सूअर' ? 'शूकर' : a);
      if (id === 'vamana') n.aliases = n.aliases.map(a => a === 'बौना' ? 'बटुक' : a);
      if (id === 'narasimha') n.aliases = n.aliases.map(a => a === 'नर-सिंह' ? 'महानृसिंह' : a);
      if (id === 'hiranyagarbha') n.aliases = n.aliases.map(a => a === 'स्वर्ण बीज' ? 'स्वर्णबीज' : (a === 'स्वर्ण गर्भ' ? 'स्वर्णगर्भ' : a));
      if (id === 'brahman') n.aliases = n.aliases.map(a => a === 'ब्रह्म (नपुंसकलिंग)' ? 'परब्रह्म' : a);
    }
  }
}

// Process all files
for (const lang of ['ne', 'hi']) {
  const dir = path.join(base, lang);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  for (const f of files) {
    const filePath = path.join(dir, f);
    let raw = fs.readFileSync(filePath, 'utf8');
    let parsed = JSON.parse(raw);

    // Apply alias fixes on parsed objects
    fixAliases(parsed, lang);

    // Polish serialized content
    let jsonStr = JSON.stringify(parsed, null, 2);
    if (lang === 'ne') {
      jsonStr = polishNepaliText(jsonStr);
    } else {
      jsonStr = polishHindiText(jsonStr);
    }

    // Verify it is still valid JSON
    JSON.parse(jsonStr);

    fs.writeFileSync(filePath, jsonStr + '\n', 'utf8');
  }
  console.log(`Polished all ${files.length} files in ${lang}`);
}
