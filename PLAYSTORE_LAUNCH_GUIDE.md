# KAP Edutech — Play Store Launch Guide
**Step-by-step process to go live on Google Play Store**

---

## PHASE 1 — Deploy Web App (Admin + Scanner)
> Do this TODAY before the 3 PM trial

### Step 1: Deploy Web App to Vercel (Free)
1. Go to **vercel.com** → Sign up with GitHub
2. Click **"Add New Project"** → Import your GitHub repo `kapedutech-platform`
3. Set **Root Directory** to `apps/web`
4. Under **Environment Variables**, add:
   ```
   API_URL = https://kapedutech-platform.onrender.com
   ```
5. Click **Deploy** — done in ~2 minutes
6. Your admin panel will be live at: `https://your-project.vercel.app`
7. Scanner will be at: `https://your-project.vercel.app/scan`

### Step 2: Verify API is Live on Render
1. Go to **render.com** → Your service dashboard
2. Check service is "Live" (green status)
3. Visit: `https://kapedutech-platform.onrender.com/api/health`
   - Should return `{"status":"ok"}` or similar
4. If sleeping, just wait 30–60 seconds for it to wake up

### Step 3: Test Before 3 PM Trial
1. Open admin panel → Add 15 students with enrollment numbers
2. Open scanner on a laptop/tablet → Go to `/scan`
3. Print QR codes from admin panel → `/admin/qr-codes`
4. Test one scan yourself before students arrive

---

## PHASE 2 — Google Play Store Setup

### Step 4: Buy Google Play Developer Account
1. Go to: **play.google.com/console**
2. Sign in with your Google account (use your business email)
3. Click **"Get started"** → Pay **$25 (one-time, ~₹2,100)**
4. Fill in developer name: **KAP Edutech**
5. Account activation takes **1–2 business days**

### Step 5: Set Up EAS Build (Expo App Build Service)
> Run these commands in your terminal

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to your Expo account (create one at expo.dev if needed)
eas login

# Go to mobile app folder
cd apps/mobile

# Configure EAS for your project
eas build:configure
```

### Step 6: Build the Android App
```bash
# Build production APK/AAB for Play Store
eas build --platform android --profile production
```
- This takes about **10–15 minutes**
- EAS builds it in the cloud (you don't need Android Studio)
- You'll get a download link for the `.aab` file
- **IMPORTANT:** Save the keystore file that gets generated — you can NEVER lose it

### Step 7: Prepare Store Listing Assets
You need these before submitting:

| Asset | Size | Notes |
|---|---|---|
| App Icon | 512×512 PNG | No rounded corners, no transparency |
| Feature Graphic | 1024×500 PNG | Banner shown on Play Store page |
| Screenshots | Min 2 phone screenshots | Take from your phone/Expo Go |
| Short Description | Max 80 characters | e.g., "Track your child's attendance at KAP Edutech" |
| Full Description | Max 4000 characters | What the app does, features list |
| Privacy Policy URL | A webpage | Required for any app with login |

### Step 8: Create Privacy Policy Page
You need a public URL for your privacy policy.
- Free option: Create a page on **privacypolicies.com** (free tier)
- Or add a `/privacy` page to your Vercel web app

### Step 9: Submit to Play Store
1. Go to **play.google.com/console**
2. Click **"Create app"**
3. Fill in:
   - App name: **KAP Edutech**
   - Default language: **Hindi / English**
   - App type: **App**
   - Free or paid: **Free**
4. Complete all sections in the dashboard (they show a checklist)
5. Upload your `.aab` file under **Production → Releases**
6. Submit for review

### Step 10: Play Store Review
- Google reviews take **3–7 business days** for first submission
- After approval, the app goes live
- Future updates usually review in **2–4 hours**

---

## PHASE 3 — After Launch

### Add Email OTP (Free, No DLT needed)
1. Sign up at **resend.com** (free: 3,000 emails/month)
2. Get your API key
3. Add to Render environment variables: `RESEND_API_KEY=your_key`
4. We update the login flow to use email instead of phone

### Later: Switch to SMS OTP (When scaling)
1. Register at **vilpower.in** for DLT (~₹6,000 one-time)
2. Takes 7 business days for approval
3. Get your Sender ID approved (e.g., KAPEDH)
4. Update the API to use Fast2SMS / MSG91
5. Push an app update — parents get it automatically

### Future Features Roadmap
| Feature | What's needed |
|---|---|
| Results / Marks | New DB table + API + mobile screen |
| Fee Management | Stripe/Razorpay integration |
| Push Notifications | Already partially built |
| Multiple Students | Already supported in data model |

---

## QUICK REFERENCE — Important URLs

| Service | URL | Purpose |
|---|---|---|
| API (Render) | https://kapedutech-platform.onrender.com | Backend |
| Admin Panel | https://your-project.vercel.app/admin | Manage students |
| Scanner | https://your-project.vercel.app/scan | QR attendance |
| Database | neon.tech dashboard | View raw data |
| Play Console | play.google.com/console | App management |

---

## TODAY'S CHECKLIST (Before 3 PM)

- [ ] Deploy web app to Vercel
- [ ] Add `API_URL` env var in Vercel
- [ ] Confirm admin panel loads
- [ ] Add 15 student records in admin
- [ ] Print QR codes for all 15 students
- [ ] Test one scan end-to-end
- [ ] Share admin panel link with yourself on phone
- [ ] Ask parents to download Expo Go app (for trial)
- [ ] Share the Expo preview link with parents

---

*Generated: April 2026 | KAP Edutech Platform*
