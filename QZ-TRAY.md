# QZ Tray Setup Guide

Complete guide to install, configure and troubleshoot **QZ Tray** for silent
receipt printing on any new computer/terminal running the Pizza Ghar POS.

**How printing works in this app:**

```
Browser (POS/Orders/Kitchen)
   │  qz-tray.js (loaded from CDN)
   │  WebSocket → wss://localhost:8181
   ▼
QZ Tray desktop app (running on the POS computer)
   │  signed request (certificate + RSA-SHA512 signature)
   ▼
Windows printer (thermal 80mm / virtual printer)
```

When **Auto Dual Print** is ON in Settings, the app sends the **customer
bill** to the bill printer and the **kitchen order** to the kitchen printer
automatically — no print dialog, no clicking.

---

## 1. Requirements

| Requirement | Details |
|---|---|
| OS | Windows 10/11 (guide below is Windows; macOS/Linux also supported by QZ) |
| QZ Tray | **2.3.0** (the app loads `qz-tray@2.3.0` from CDN — versions must match) |
| Browser | Chrome/Edge (Chromium). Chrome 147+ needs a one-time Local Network permission (step 5) |
| Network | Website must be reachable (production: https://pizza-ghar-pos.vercel.app) |
| Java | **Not required** — QZ Tray ships with its own bundled JRE |

---

## 2. Install QZ Tray

1. Download **QZ Tray 2.3.0** from the official site:
   https://qz.io/download/
   (Windows installer: `qz-tray-2.3.0.exe`)
2. Run the installer as the **same Windows user that will use the POS**
   (not "Run as administrator" — QZ stores per-user trust settings).
3. Complete the install. QZ Tray starts automatically and shows an icon in
   the system tray (near the clock).
4. Verify it is running: open the tray icon → **About** should say
   *QZ Tray 2.3.0*.

> QZ Tray must be running **whenever** printing is needed. It starts with
> Windows by default (tray icon → *Settings* → *Startup* = enabled).

---

## 3. Install / configure the printers

The POS needs **two printers**:

| Role | Typical device | Example name |
|---|---|---|
| **Bill printer** | 80mm thermal receipt printer (USB) | `POS-80` / `Thermal Printer` |
| **Kitchen printer** | 80mm thermal printer or KDS | `Kitchen-80` |

### 3.1 Real thermal printer (USB)

1. Connect the printer via USB and install its driver (driver CD or
   manufacturer download). Windows must list it in
   **Settings → Bluetooth & devices → Printers & scanners**.
2. Print a Windows test page to confirm the driver works.
3. Recommended printer preferences:
   - Paper size: **80 × receipt** (or 72mm/80mm roll)
   - Print quality: **203 DPI** (default)
   - **Disable** "Pause printing" / spooler delays if present
4. Note the **exact printer name** as Windows shows it — this exact string
   is what the POS dropdown will show (names are case-sensitive in QZ).

### 3.2 Virtual printers (for testing without hardware)

Virtual printers let you verify the whole flow before buying hardware.
Each print job opens the Windows **Save as PDF** dialog (PORTPROMPT) —
that proves the website → QZ → printer pipeline works end-to-end.

1. **Settings → Printers & scanners → Add device → Add manually**
   → *Add a printer that isn't listed* → **Add a local printer or
   network printer with manual settings**
2. Use port: **LPT1:** (any unused port works)
3. Manufacturer: **Generic** → Printer: **Generic / Text Only**
4. Name it exactly:
   - `Virtual Printer 1`  → used as the **bill** printer
   - `Virtual Printer 2`  → used as the **kitchen** printer
5. Finish. Both appear in *Printers & scanners*.

> For daily real printing, assign the two **real** thermal printers instead.
> The virtual pair is only for setup/testing.

---

## 4. Trust the website in QZ (silent printing, no prompts)

By default QZ asks **"Allow pizza-ghar-pos.vercel.app?"** on every print.
This project signs every request so QZ trusts the site automatically.

### What is already configured (production)

| Piece | Where it lives | Purpose |
|---|---|---|
| Public certificate | `public/qz-cert.pem` (served at `/qz-cert.pem`) | Identifies the website to QZ |
| Private key | Vercel env var **`QZ_PRIVATE_KEY`** | Server-side signing via `POST /api/qz-sign` |
| Signing | `src/app/api/qz-sign/route.js` (RSA-SHA512) | Signs each QZ call — requires a logged-in user |
| Client hookup | `src/utils/autoPrint.js` → `setupQzSecurity()` | Feeds cert + signature into qz-tray.js |

**No action needed for these** — they deploy with the site.

### One-time local auto-trust (kills the Allow prompt)

Even with signing, QZ shows its **first-run certificate prompt** once per
computer. To make it fully automatic, place the site certificate into QZ's
trust store and point QZ at it:

1. Save the site certificate as `pos-site-cert.pem` (download
   `https://pizza-ghar-pos.vercel.app/qz-cert.pem` and save it, or copy
   from `public/qz-cert.pem` in the repo).
2. Put it in QZ's data folder:
   ```
   C:\Users\<user>\AppData\Roaming\qz\pos-site-cert.pem
   ```
3. Set a **persistent user environment variable** (PowerShell, run as the
   POS user):
   ```powershell
   [Environment]::SetEnvironmentVariable(
     "JAVA_TOOL_OPTIONS",
     "-Dauthcert.override=C:\Users\<user>\AppData\Roaming\qz\pos-site-cert.pem",
     "User"
   )
   ```
4. **Restart QZ Tray** (tray icon → *Exit*, then reopen) and restart the
   browser.

Result: QZ trusts the site without any dialog on every print.

> Replace `<user>` with the actual Windows username. If the path contains
> spaces, wrap the whole value in double quotes when setting the variable.

---

## 5. Browser permission (Chrome 147+ Local Network Access)

Modern Chrome blocks public websites from reaching `localhost` (where QZ
listens) until the user allows it — error
`ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`.

**First time on a new computer:**

1. Open **https://pizza-ghar-pos.vercel.app/admin/settings**
2. If blocked, a banner appears:
   *"Chrome is blocking QZ Tray until you allow local network access."*
3. Click **Allow Access** → Chrome shows the *Local Network Access*
   prompt → choose **Allow**.
4. The printer list appears.

**Manual path (if the button is not shown):**
Chrome → *Settings* → *Privacy and security* → *Site settings* →
*Additional permissions* → **Loopback network devices** → add
`https://pizza-ghar-pos.vercel.app` → **Allow**.

> Equivalent in Edge. Once granted, the permission persists for the site.

---

## 6. Configure the POS (Settings page)

1. Login as **Admin** → **Settings**.
2. On load the page detects printers (or click **Refresh Printers**).
   Expected: *"N printer(s) detected"* and both dropdowns populated.
3. **Customer Bill Printer** → select the bill printer
   (e.g. `Virtual Printer 1` or the real thermal printer).
4. **Kitchen Receipt Printer** → select the kitchen printer
   (e.g. `Virtual Printer 2`).
5. Turn **Auto Dual Print** ON.
6. Click **Save**.

**Done.** From now on:
- Saving/printing an order → bill goes to the bill printer,
  kitchen copy goes to the kitchen printer — automatically, silently.
- Settings are read fresh from the server on every print, so changing
  printers/toggle applies to the **next** print (no restart needed).

---

## 7. Verify the setup

1. **Settings page** shows `N printer(s) detected` and no red banner.
2. Place a test order (or use **Orders → Print**) with Auto Dual Print ON:
   - Bill printer → Save dialog (virtual) or paper (real)
   - Kitchen printer → Save dialog / paper
3. If anything fails, an alert explains exactly what is wrong
   (QZ not running / printer not found / Chrome blocked / not approved).

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| *"QZ Tray is not running…"* | QZ app closed | Start QZ Tray (tray icon). Check `wss://localhost:8181` is listening |
| *"Chrome is blocking QZ Tray until you allow local network access"* | Chrome LNA = prompt | Click **Allow Access** in Settings (step 5) |
| *"Chrome blocked local network access… (Loopback network = Block)"* | LNA denied | Chrome settings → Loopback network devices → allow the site |
| *"Printer \"X\" not found. Installed printers: …"* | Name mismatch | Select the exact name from the dropdown (detect first) |
| *"QZ Tray connection was not approved…"* | Cert/prompt not accepted | Re-run the auto-trust setup (step 4), restart QZ + browser |
| *"No … printer selected. Open Settings…"* | Dropdowns empty | Settings → detect → select printers → Save |
| *"Connecting to QZ Tray timed out"* | QZ hung | Tray icon → Exit → restart QZ Tray |
| Printer list empty though QZ runs | Permission/cert issue | Check debug log (below) |
| Print goes to wrong printer | Wrong assignment | Settings → re-assign bill/kitchen printers → Save |

### Debug log

QZ writes a detailed log here — attach it to any bug report:

```
%APPDATA%\qz\debug.log
```
(Press `Win+R` → paste the path → Enter.)

Useful entries: connection attempts, certificate validation, printer
lookups, print job status.

### Quick health checks

```powershell
# Is QZ listening? (expect a line with :8181)
netstat -ano | findstr :8181

# Is the site certificate reachable?
curl https://pizza-ghar-pos.vercel.app/qz-cert.pem
```

### Reset QZ trust (start over)

Delete QZ's per-user data (stops all prompts, forgets trust):
```
%APPDATA%\qz\
```
(QZ recreates defaults on next start; redo step 4 afterwards.)

---

## 9. New terminal checklist

Copy this for every new POS computer:

- [ ] QZ Tray **2.3.0** installed and running (starts with Windows)
- [ ] Bill printer installed + Windows test page prints
- [ ] Kitchen printer installed + Windows test page prints
- [ ] Exact printer names noted (as shown in Windows)
- [ ] `pos-site-cert.pem` placed in `%APPDATA%\qz\`
- [ ] `JAVA_TOOL_OPTIONS=-Dauthcert.override=…` user variable set (step 4)
- [ ] QZ Tray + browser restarted
- [ ] Chrome **Loopback network** permission granted for the site (step 5)
- [ ] Admin → Settings: printers detected, both dropdowns assigned,
      Auto Dual Print ON, **Save**
- [ ] Test order prints bill + kitchen copies
- [ ] `%APPDATA%\qz\debug.log` clean (no cert/printer errors)

---

## 10. Code reference (for developers)

| Concern | File |
|---|---|
| QZ connection, security, print, preflight | `src/utils/autoPrint.js` |
| Settings UI (detect, dropdowns, toggle, LNA banner) | `src/components/pages/AdminSettings.jsx` |
| Signature endpoint (RSA-SHA512, `QZ_PRIVATE_KEY`) | `src/app/api/qz-sign/route.js` |
| Public certificate | `public/qz-cert.pem` → served at `/qz-cert.pem` |
| Print settings storage (autoDualPrint / billPrinter / kitchenPrinter) | `admin-settings` collection via `/api/admin-settings` |
| Receipt HTML (80mm, `pageWidth: 80`, mm units) | built inside `src/utils/autoPrint.js` + print templates in POS/Orders/ChefOrders |

Key API facts:
- Library: `qz-tray@2.3.0` from `https://cdn.jsdelivr.net/npm/`
- Connect: `qz.websocket.connect()` — active check is
  `qz.websocket.isActive()` (**not** `isConnected()`)
- Printer list: `qz.printers.find()` (no-arg = all printers);
  `qz.printers.find(name)` = exact lookup
- Print: `qz.configs.create(printer, { units: "mm", margins: 0 })` +
  pixel/HTML data, `pageWidth: 80`
