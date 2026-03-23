# MediTrack — Feature Roadmap

Track planned, in-progress, and completed features. Grouped by priority tier.

---

## Current Features (Shipped)

- [x] Email/Password & Google OAuth authentication
- [x] Profile creation & editing (name, DOB)
- [x] Add/edit/delete medications (8 form types, icon selection)
- [x] Inventory tracking (current supply, low supply threshold, auto-decrement)
- [x] Low supply push notifications
- [x] Medication scheduling (daily, weekly, interval)
- [x] Multiple times per day with preset & custom times
- [x] Date ranges (start/end) for schedules
- [x] Dosage per dose configuration
- [x] Special instructions per schedule
- [x] Push notification reminders
- [x] Snooze system (30s–30min) with countdown & notification actions
- [x] Dose logging (take/skip/undo) with optimistic UI
- [x] Calendar view (week strip + full month)
- [x] Adherence reports (7/30/90 days) with progress ring & charts
- [x] Current streak tracking
- [x] Caregiver sharing (text summary via native share)
- [x] Data export (JSON)
- [x] Dark mode (light/dark/system)
- [x] Offline support with optimistic updates
- [x] Battery optimization handling (Android)
- [x] Ad system (banners, interstitials, app open ads) with per-placement toggles
- [x] Help & Support (FAQ + email)
- [x] Privacy & Security (data export, sign out all, account deletion)
- [x] Notification management screen (scheduled + delivered)
- [x] Password management (change/set for OAuth users)
- [x] Google account disconnect
- [x] Tablet/iPad layout (side rail nav, responsive screens, master-detail medications)
- [x] Drug search & interaction check in Edit Medication
- [x] PRN medication autocomplete dropdown
- [x] FAB "Add Medication" quick action

---

## Tier 1 — High Impact, Low Effort

| Status | Feature | Description |
|--------|---------|-------------|
| ✅ | **PRN ("As Needed") Medications** | Support medications without fixed schedules. Users log doses on-demand with timestamp, dosage, and optional reason. PRN doses appear in history/reports but NOT in the "upcoming" section. |
| ✅ | **Medication Database + Drug Interaction Checker** | Replace free-text medication name input with searchable autocomplete powered by NLM RxNorm API. Store RxCUI identifier. Use OpenFDA Drug Labeling API to check for drug-drug interactions. |
| ✅ | **Symptom & Side Effect Tracking** | Let users log symptoms/side effects alongside their medication routine. Track severity (mild/moderate/severe), optional medication association, and notes. Show symptom trends in reports. |
| 🔲 | **PDF Report Export** | Generate and share medication adherence reports as PDF documents. Include adherence stats, charts, medication list, and missed doses. Useful for doctor visits. |
| 🔲 | **Multi-Language Support (i18n)** | Internationalize the app. Priority languages: Spanish, French, German, Portuguese, Chinese, Japanese. Use `expo-localization` + `i18next`. |
| ✅ | **Tablet/iPad Layout** | Responsive layouts for larger screens. Side-by-side medication list + detail view, wider report charts, optimized calendar views. |

---

## Tier 2 — Medium Impact, Medium Effort

| Status | Feature | Description |
|--------|---------|-------------|
| 🔲 | **Medication Photos** | Let users photograph their medication packaging or pills. Helps with identification, especially for elderly users or complex regimens. |
| 🔲 | **Doctor/Pharmacy Contacts** | Store prescriber and pharmacy contact details linked to medications. Quick-call or quick-refill actions from medication detail screen. |
| 🔲 | **Refill Reminders & Pharmacy Integration** | Smart refill alerts based on current supply and dosage rate. Calculate days until empty. Optional pharmacy lookup for refill requests. |
| 🔲 | **Family/Dependent Profiles** | Manage medications for family members (children, elderly parents) under a single account. Profile switcher with color-coded UI per dependent. |
| 🔲 | **Apple Health / Google Fit Integration** | Sync medication data with platform health APIs. Log doses as health records. Import relevant health metrics (blood pressure, glucose) for correlation with medications. |
| 🔲 | **Flexible Dosage Logging** | Allow users to log partial doses (e.g., "took half"), double doses, or custom amounts instead of just taken/skipped. Track actual vs. prescribed dosage. |
| 🔲 | **Medication Interaction Alerts (Real-time)** | Show interaction warnings when adding a new medication that conflicts with existing ones. Include food interactions (grapefruit, alcohol, dairy). |
| 🔲 | **Dark Mode Scheduling** | Auto-switch between light/dark mode based on time of day, not just system setting. Customizable schedule (e.g., dark mode after 9 PM). |

---

## Tier 3 — High Impact, High Effort

| Status | Feature | Description |
|--------|---------|-------------|
| 🔲 | **Offline Mode with Sync** | Full offline functionality with background sync when connectivity returns. Queue mutations locally, resolve conflicts on sync. |
| 🔲 | **Wearable Support (WatchOS / WearOS)** | Companion app for smartwatches. Quick dose logging from wrist, vibration reminders, glanceable next-dose info. |
| 🔲 | **AI-Powered Insights** | Machine learning analysis of adherence patterns. Predict missed doses, suggest optimal reminder times, identify trend anomalies. |
| 🔲 | **Telehealth Integration** | Connect with telehealth platforms. Share medication data with providers, receive prescription updates directly in-app. |
| 🔲 | **Voice Control** | "Hey Siri/Google, log my morning medications." Voice-activated dose logging and medication queries via platform assistants. |
| 🔲 | **Barcode/QR Scanner** | Scan medication packaging barcodes (NDC codes) to auto-populate medication details. Link to drug database for instant info. |

---

## Tier 4 — Nice to Have

| Status | Feature | Description |
|--------|---------|-------------|
| 🔲 | **Gamification & Streaks** | Achievement badges, streak milestones (7-day, 30-day, 100-day), progress celebrations. Motivational notifications for maintaining streaks. |
| 🔲 | **Mood Tracking** | Daily mood logging (1-5 scale or emoji-based) to correlate emotional state with medication adherence and side effects. |
| 🔲 | **Custom Reminder Sounds** | Let users choose notification sounds per medication or schedule. Include calming/medical-themed sound options. |
| 🔲 | **Medication Cost Tracking** | Track medication costs, insurance copays, and out-of-pocket expenses. Monthly/yearly cost summaries and cost-saving suggestions. |
| 🔲 | **Community / Support Groups** | Anonymous community forums for medication-specific support groups. Share tips, experiences, and encouragement with other users. |
| ✅ | **Widget Support** | Home screen widget for iOS and Android showing next upcoming dose (name, dosage, time) without opening the app. |
| 🔲 | **Medication Tapering Schedules** | Support gradual dose reduction schedules for medications being discontinued. Auto-adjust dosage over configured time periods. |

---

## Status Legend

| Icon | Meaning |
|------|---------|
| 🔲 | Not started |
| 🔨 | In progress |
| ✅ | Complete |
| ⏸️ | Paused |
| ❌ | Cancelled |

---

## Implementation Priority

**Currently implementing (Phase 1–3):**
1. **PRN Medications** — Independent, no external dependencies
2. **Symptom & Side Effect Tracking** — Independent, parallel with PRN
3. **Medication Database + Drug Interaction Checker** — Requires external API integration (RxNorm + OpenFDA)

**Next up:**
4. PDF Report Export
5. Multi-Language Support (i18n)
6. Refill Reminders

---

## Competitive Landscape

Features benchmarked against: Medisafe, MyTherapy, EveryDose, Dosecast, CareClinic, Pill Reminder All-in-One.

| Feature | Medisafe | MyTherapy | EveryDose | CareClinic | MediTrack |
|---------|----------|-----------|-----------|------------|-----------|
| PRN Medications | ✅ | ✅ | ✅ | ✅ | ✅ |
| Drug Interactions | ✅ | ✅ | ✅ | ✅ | ✅ |
| Symptom Tracking | ✅ | ✅ | ✅ | ✅ | ✅ |
| PDF Reports | ✅ | ✅ | ❌ | ✅ | 🔲 |
| Barcode Scanner | ✅ | ❌ | ❌ | ❌ | 🔲 |
| Family Profiles | ✅ | ❌ | ❌ | ✅ | 🔲 |
| Wearable Support | ✅ | ✅ | ❌ | ❌ | 🔲 |
| Health App Sync | ✅ | ✅ | ❌ | ✅ | 🔲 |
| Mood Tracking | ❌ | ✅ | ❌ | ✅ | 🔲 |
| Offline Mode | ✅ | ✅ | ✅ | ❌ | 🔲 |
