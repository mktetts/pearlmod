# 🐚 PearlMod: The Moderator Command Center

PearlMod is a high-fidelity, proactive moderation suite built for the Reddit Developer Platform. It empowers community leaders with client-side AI, automated enforcement engines, and real-time threat intelligence.

## 💡 Inspiration
Moderating high-traffic subreddits is often a race against volume. Standard tools are frequently reactive, leaving moderators to "mop up" toxicity after it has already spread. We built PearlMod to transform moderation from a chore into a mission control experience—giving moderators the "superpowers" of semantic intelligence and automated guardians to keep communities healthy around the clock.

## 🚀 What it does
PearlMod is a unified dashboard that consolidates fragmented moderation tasks into a single, high-fidelity interface:

*   **AI Mod Queue Assistant**: Uses a client-side **Universal Sentence Encoder (USE)** model to semantically scan reports. It provides "Auto-Analyse" capabilities for locked items, highlighting problematic evidence and providing risk scores without data ever leaving the browser. Also Moderators have *lock* feature to mitigate ambiguity when resolving the reports.
*   **Guardian Engine**: A dynamic rule-based system. Moderators can create rules with blacklisted keywords and custom "Toleration Limits."
    *   **Post Actions**: Automatically flairs violating posts and sends explanatory Private Messages (PMs) to authors.
    *   **Comment Actions**: Immediately removes violating comments. If a thread exceeds the user-defined toleration limit, the **entire post is locked** and the owner is notified via PM.
*   **Raid & Brigade Protection**: Real-time detection of rapid participation spikes, coordinate attacks, and "Hostile Bursts."
*   **Cases & Escalation**: A dedicated workflow for tracking complex moderation cases that require team-wide collaboration and follow-up.
*   **Live Analytics**: Interactive visualizations of moderation trends, solve rates, and community health metrics.

## 🛠️ How I built it
PearlMod is built on a modern, robust stack designed for the Reddit ecosystem:
*   **Frontend**: React 19 with a custom "Mission Control" dark theme, styled with **Tailwind CSS** and powered by **Lucide-React** icons.
*   **Intelligence**: **TensorFlow.js** running the Universal Sentence Encoder (USE). We optimized the model to run on the **CPU backend** within the Reddit Webview for maximum compatibility.
*   **Backend**: **Hono** for lightweight, high-performance API routing.
*   **State & Storage**: **Redis** handles everything from real-time violation counters and rule storage to escalated case snapshots.
*   **Platform**: Built exclusively for **Devvit**, utilizing the full power of Triggers (Content Submit, Reports, Mod Actions) and the Webview API.

## 🚧 Challenges I ran into
*   **Asset Delivery**: Integrating a 30MB+ ML model into a Reddit Webview was challenging. We had to move the model shards to the `public` directory and manage static asset fetching manually to avoid 404 errors during the build process.
*   **Trigger Payload Nuances**: Reddit's trigger payloads can be highly inconsistent. We had to build a robust data extraction layer to handle variations in how `author` and `content` fields are populated across different event types.
*   **Real-time Sync**: Coordinating between background triggers (Automod removals) and the moderator's live dashboard required a carefully designed Redis state management system to ensure data consistency.

## ✨ Accomplishments that I'm proud of
*   **Zero-Latency Enforcement**: Achieving immediate comment removal and thread locking based on semantic matches before a moderator even sees the item.
*   **Privacy-First AI**: Running sophisticated semantic analysis entirely on the client side, ensuring moderator activity and community data remain private.
*   **Unified UX**: Creating a professional-grade dashboard that feels like a premium SaaS product but is available for free to community volunteers.

## 🧠 What I learned
*   **ML in Constraints**: Learned how to effectively deploy and optimize machine learning models in restricted web environments like the Reddit Webview.
*   **Event-Driven Moderation**: Gained deep insights into Reddit's trigger-based architecture and how to build resilient automated systems around it.
*   **Mission-Critical Design**: Focused on how to design UIs for high-stress environments where clarity and speed are paramount.

## 🔮 What's next for PearlMod
*   **Improvement in UI**: UI will be improved much better.
*   **Multilingual Support**: Integrating lightweight multilingual models to support non-English speaking communities.
*   **Mobile Command Center**: Further optimizing the dashboard for a seamless "on-the-go" moderation experience in the Reddit mobile app.

---

