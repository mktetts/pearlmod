import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';
import * as use from '@tensorflow-models/universal-sentence-encoder';

/**
 * ═══════════════════════════════════════════════════════════════
 * CLIENT-SIDE AI ENGINE (WEBVIEW OPTIMIZED)
 * ═══════════════════════════════════════════════════════════════
 */

const CONFIG = {
  SIMILARITY_THRESHOLD: 0.52,
  UNCERTAIN_THRESHOLD: 0.38,
  HIGH_RISK_SCORE: 70,
  MEDIUM_RISK_SCORE: 40,
  LOW_RISK_SCORE: 15,
};

const WEIGHTS: any = {
  semantic: {
    toxic_language: 60,
    hate_speech: 115,
    threat: 110,
    harassment: 90,
    minor_abuse: 120,
    personal_info: 100,
    non_consensual_media: 110,
    prohibited_transaction: 80,
    impersonation: 70,
    manipulated_content: 60,
    copyright_violation: 50,
    trademark_violation: 50,
    self_harm: 110,
    scam: 65,
    spam: 40,
    brigade_coordination: 60,
    report_abuse: 50,
    promo_spam: 30,
  },
  rule_match_per_hit: 25,
  mod_signal_per_hit: 20,
};

const SEMANTIC_CATEGORIES: Record<string, string[]> = {
  toxic_language: [
    "Shut up you absolute idiot, what a stupid brainless take, literal garbage opinion, go cry about it.",
    "You are completely worthless, swearing and aggressive insults at someone, calling people morons and losers.",
    "You are pathetic and dumb, stop posting trash, absolute waste of space, degrading put-down comments.",
  ],
  hate_speech: [
    "I hate all people from that religion, they do not deserve rights and should be kicked out.",
    "Using derogatory slurs to attack someone's race or ethnicity, hateful xenophobic comments.",
    "Discriminating against groups based on gender identity or sexual orientation, attacking minorities.",
    "Promoting white supremacy, antisemitic rhetoric, Islamophobia, or transphobic attacks.",
  ],
  threat: [
    "I am going to hurt you, I know where you live and I am coming for you, you better watch out.",
    "Threatening physical violence against a user, issuing a direct personal death threat.",
    "I will find you and make you pay, violent threats towards a specific person, I'm going to kill you.",
  ],
  harassment: [
    "I am going to dox you, targeting you specifically, stalking your post history to harass you.",
    "Cyberbullying an individual, repeated targeted attacks at one user, user-specific callout posts.",
    "Sharing someone's private personal information without consent, threatening to expose them.",
  ],
  minor_abuse: [
    "Hey kid, you look cute, want to chat privately? Send me a pic and I'll send you one.",
    "Asking a minor for their age, location, or private social media to groom them.",
    "Sexualizing children or using predatory language towards minors in comments.",
    "I'm a teen too, want to trade photos? Tell me where you go to school.",
  ],
  personal_info: [
    "His real name is John Doe and he lives at 123 Main Street, Springfield. Go get him.",
    "Doxing someone by posting their private cell phone number, home address, or workplace.",
    "Sharing someone's private email address or social media profiles without their consent to harass them.",
    "Leaking private identifying information like IP addresses, full names, or physical locations.",
  ],
  non_consensual_media: [
    "Sharing intimate photos or videos of someone without their permission, revenge porn.",
    "Leaked private adult content, non-consensual deepfakes of an intimate nature.",
    "Posting links to stolen private media or non-consensual sexual imagery.",
  ],
  prohibited_transaction: [
    "Selling illegal drugs, weapons, or stolen goods, advertising forbidden items for sale.",
    "Facilitating transactions for regulated substances, firearms, or counterfeit currency.",
    "Buying or selling reddit accounts, upvotes, or prohibited digital services.",
  ],
  impersonation: [
    "Pretending to be a public figure or moderator to deceive users, fake official accounts.",
    "I am actually a Reddit admin and I need your password to verify your account.",
    "Impersonating another user to harass them or damage their reputation, identity theft.",
  ],
  manipulated_content: [
    "Deepfake videos used to spread misinformation, AI-generated content designed to deceive.",
    "Photoshopped images meant to harass or mislead, manipulated media for political propaganda.",
    "Coordinated spread of fake news using edited or synthetic media.",
  ],
  copyright_violation: [
    "Sharing links to pirated movies, music, or software, copyright infringement.",
    "Posting full articles or premium content from behind a paywall without authorization.",
    "Uploading copyrighted media that you do not own the rights to.",
  ],
  trademark_violation: [
    "Selling counterfeit brand-name goods, using trademarks to deceive customers.",
    "Impersonating a brand or company using their logos and trademarks without permission.",
    "Advertising fake luxury items or trademarked products as genuine.",
  ],
  self_harm: [
    "I want to end my life, I have no reason to live anymore, expressing suicidal thoughts.",
    "Encouraging someone to hurt themselves, glorifying self-harm or suicide.",
    "I am planning to harm myself tonight, looking for ways to commit suicide.",
  ],
  scam: [
    "DM me to unlock your crypto wallet, free Bitcoin giveaway, airdrop claim link, recover lost funds.",
    "Click here to verify your wallet, limited time crypto offer, send ETH to receive double back.",
    "Join this Telegram channel for massive returns, get rich quick, guaranteed passive income scheme.",
  ],
  spam: [
    "Check out my YouTube channel, use my promo code, subscribe for more content, affiliate link.",
    "Repeatedly posting the same link or comment, bot-like behavior, advertising unrelated services.",
    "Visit my website for cheap products, commercial spam, mass-posted marketing garbage.",
  ],
  brigade_coordination: [
    "Everyone go report this post right now, coordinated downvote this user, mass report this subreddit.",
    "Join our Discord to coordinate attacks, brigade this thread, send hate to this account together.",
    "Organize mass reporting, downvote brigade, harass this user together, coordinated targeted attack.",
  ],
  report_abuse: [
    "Falsely reporting every post in this sub to overwhelm the mods, weaponizing the report button.",
    "Encouraging users to file fake reports against a specific individual or community.",
    "Spamming the report system with frivolous or malicious claims to harass users.",
  ],
};

const RULE_PATTERNS = {
  crypto_scam: [
    /\b(free\s+bitcoin|free\s+crypto|airdrop|dm\s+me|wallet\s+key|verify\s+your\s+wallet|doubl(e|ing)\s+(your\s+)?(bitcoin|eth|money))\b/i,
    /\b(recover\s+(lost\s+)?funds|get\s+rich\s+quick|guaranteed\s+(profit|return)|passive\s+income\s+guaranteed)\b/i,
    /(t\.me\/|discord\.gg\/|telegram\.me\/)[\w-]+/i,
  ],
  phishing_links: [
    /https?:\/\/[^\s]*(bit\.ly|tinyurl|rebrand\.ly|cutt\.ly)[^\s]*/i,
    /\b(click\s+(this\s+)?link|verify\s+your\s+account|login\s+to\s+claim|confirm\s+your\s+wallet)\b/i,
  ],
  self_promotion: [
    /\b(follow\s+me|check\s+out\s+my\s+(channel|profile|store|page)|use\s+my\s+(promo|referral|coupon)\s+code)\b/i,
    /\b(subscribe\s+(to\s+)?my|visit\s+my\s+(store|shop|website)|link\s+in\s+(bio|profile))\b/i,
  ],
  ban_evasion_signals: [
    /\b(my\s+(other|old|previous|main|alt)\s+account\s+(was\s+)?(banned|suspended|removed))\b/i,
    /\b(ban\s+evad(e|ing)|new\s+account\s+because\s+(i\s+)?got\s+banned)\b/i,
  ],
};

/**
 * ═══════════════════════════════════════════════════════════════
 * SECTION 2: STATE & INITIALIZATION
 * ═══════════════════════════════════════════════════════════════
 */

let _useModel: use.UniversalSentenceEncoder | null = null;
let _categoryEmbeddings: Record<string, number[]> | null = null;
let _isLoaded = false;

export async function loadModel() {
  if (_isLoaded) return;
  console.log('>>> [AI-CLIENT] Initializing Universal Sentence Encoder (WebView CPU)...');
  
  try {
    await tf.setBackend('cpu');
    await tf.ready();
    
    // 🚨 FIX: Explicitly point to local paths for model and vocabulary
    // This prevents the library from trying to reach googleapis.com
    const modelUrl = 'models/use/model.json';
    const vocabUrl = 'models/use/vocab.json';
    
    console.log(`>>> [AI-CLIENT] Loading model from local bundle...`);
    _useModel = await use.load({ modelUrl, vocabUrl });
    
    console.log('>>> [AI-CLIENT] Pre-computing category embeddings...');
    await _precomputeEmbeddings();
    
    _isLoaded = true;
    console.log('>>> [AI-CLIENT] AI Engine Ready on client.');
  } catch (err) {
    console.error('>>> [AI-CLIENT] FAILED to load model:', err);
    throw err;
  }
}

async function _precomputeEmbeddings() {
  if (!_useModel) return;
  _categoryEmbeddings = {};
  for (const [name, descriptions] of Object.entries(SEMANTIC_CATEGORIES)) {
    const tensor = await _useModel.embed(descriptions);
    const matrix = await tensor.array() as number[][];
    tensor.dispose();
    _categoryEmbeddings[name] = _averageVectors(matrix);
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * SECTION 3: CLASSIFICATION API
 * ═══════════════════════════════════════════════════════════════
 */

export async function classify(text: string) {
  if (!_isLoaded) await loadModel();
  if (!text || text.trim().length === 0) return _safeResult();

  const semanticResults = await _runSemanticSimilarity(text);
  const ruleMatches = _runRuleChecks(text);
  
  let score = 0;
  let primaryCategory = 'SAFE';
  let maxSim = 0;

  for (const [label, data] of Object.entries(semanticResults)) {
    const isUncertain = label.includes('_uncertain');
    const baseLabel = isUncertain ? label.replace('_uncertain', '') : label;
    const weight = WEIGHTS.semantic[baseLabel] ?? 20;

    const simScore = (data as any).score;
    const effectiveWeight = isUncertain ? weight * 0.5 : weight;
    score += simScore * effectiveWeight;
    
    if (simScore > maxSim) {
        maxSim = simScore;
        primaryCategory = baseLabel.toUpperCase();
    }
  }

  score += ruleMatches.length * WEIGHTS.rule_match_per_hit;
  const finalScore = Math.min(score, 100);

  const evidence: string[] = [];
  for (const data of Object.values(semanticResults)) {
    (data as any).words?.forEach((w: string) => evidence.push(w));
  }
  ruleMatches.forEach(r => evidence.push(r.text));

  return {
    category: finalScore > 20 ? primaryCategory : 'SAFE',
    score: parseFloat((finalScore / 100).toFixed(4)),
    evidence: [...new Set(evidence)].slice(0, 5)
  };
}

async function _runSemanticSimilarity(text: string) {
  if (!_useModel || !_categoryEmbeddings) return {};
  
  const tensor = await _useModel.embed([text]);
  const inputEmbedding = (await tensor.array() as number[][])[0];
  tensor.dispose();

  const results: Record<string, any> = {};
  for (const [categoryName, catEmbedding] of Object.entries(_categoryEmbeddings)) {
    const score = _cosineSimilarity(inputEmbedding, catEmbedding);
    if (score >= CONFIG.SIMILARITY_THRESHOLD) {
      results[categoryName] = {
        score: parseFloat(score.toFixed(4)),
        words: await _findSemanticKeywords(text, categoryName)
      };
    } else if (score >= CONFIG.UNCERTAIN_THRESHOLD) {
      results[`${categoryName}_uncertain`] = {
        score: parseFloat(score.toFixed(4)),
        words: await _findSemanticKeywords(text, categoryName)
      };
    }
  }
  return results;
}

async function _findSemanticKeywords(text: string, categoryName: string) {
  if (!_useModel || !_categoryEmbeddings) return [];
  const words = text.split(/\s+/).map(w => w.replace(/[^\w]/g, '')).filter(w => w.length > 3);
  if (words.length === 0) return [];
  
  const wordTensors = await _useModel.embed(words);
  const wordEmbeddings = await wordTensors.array() as number[][];
  wordTensors.dispose();
  
  const catEmbedding = _categoryEmbeddings[categoryName];
  const relevantWords = [];
  
  for (let i = 0; i < words.length; i++) {
    const sim = _cosineSimilarity(wordEmbeddings[i], catEmbedding);
    if (sim > 0.3) {
      relevantWords.push(words[i]);
    }
  }
  return [...new Set(relevantWords)].slice(0, 5);
}

function _runRuleChecks(text: string) {
  const matches: { rule: string, text: string }[] = [];
  for (const [ruleName, patterns] of Object.entries(RULE_PATTERNS)) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) { 
        matches.push({ rule: ruleName, text: match[0] }); 
      }
    }
  }
  return matches;
}

function _safeResult() {
  return { category: 'SAFE', score: 0, evidence: [] };
}

function _cosineSimilarity(vecA: number[], vecB: number[]) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot   += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function _averageVectors(vectors: number[][]) {
  const len = vectors[0].length;
  const result = new Array(len).fill(0);
  for (const vec of vectors) for (let i = 0; i < len; i++) result[i] += vec[i];
  return result.map(v => v / vectors.length);
}
