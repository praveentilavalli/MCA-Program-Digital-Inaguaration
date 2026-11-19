MCA PROGRAMME - DIGITAL INAUGURATION (Node.js + Express + Socket.IO)
=====================================================================

HOW IT WORKS
  PROJECTOR PC : shows the red curtain with balloons, ribbon and MCA emblem,
                 "awaiting the inaugural tap"  (no button on the projector)
  PHONE        : a separate simple page with ONE big "TAP TO INAUGURATE" button
                 (dark blue page - it does NOT look like the curtain)
  TAP          : phone -> sends command to the server -> server tells the
                 projector -> the show starts: coding terminal, balloon blast,
                 curtain opens, MCA poster, applause with music, flower shower,
                 "Inaugurated by Dr. Manjunath P."
  No internet needed - only the same Wi-Fi / hotspot.

ONE-TIME SETUP (projector PC, today)
  1. Install Node.js LTS from https://nodejs.org  (Next > Next > Finish)
  2. Make sure Google Chrome (or Microsoft Edge) is installed.
  3. Unzip this folder, e.g. to Desktop\mca-launch
     (all packages are already inside node_modules).

ON THE DAY
  1. Connect the PC and the phone to the SAME Wi-Fi.
     No Wi-Fi? Turn on the phone's hotspot and connect the PC to it.
  2. Double-click START.bat.
     - A black window opens with the phone address + QR code.
       KEEP IT OPEN (minimise it). It logs every step.
     - If Windows Firewall asks: tick "Private networks" > Allow access.
     - The CURTAIN page opens on the projector automatically in full screen
       with sound enabled. No click needed on the PC.
  3. On the phone: scan the QR code from the black window
     (or type the address shown, e.g. http://192.168.x.x:3000/remote).
     The phone must show "Curtain ready - tap to inaugurate".
  4. Hand the phone to Dr. Manjunath P. He taps INAUGURATE -> show starts.
  5. Afterwards close the show with Alt+F4.

REHEARSAL
  - Tap INAUGURATE on the phone, watch the projector.
  - To run again: Alt+F4 on the projector, open http://localhost:3000/open-curtain
    in any browser on the PC (curtain re-opens), tap "Reset" on the phone.
  - Test without the phone: open http://localhost:3000/test on the PC.

BACKUPS
  - Show did not start from the phone: press Enter on the projector PC.
  - Curtain page not open: the phone tap opens the show directly anyway.
  - If the curtain shows "Click to arm the screen", click once (this happens
    only if the browser was opened by hand instead of by START.bat).

IF THE PHONE DOES NOT SHOW THE INAUGURATE BUTTON
  1. Run FIREWALL-FIX.bat once (click "Yes" for administrator), then
     close the black window and double-click START.bat again.
  2. Use the address marked "<-- use this" in the black window, typed
     exactly with http:// (not https), e.g.  http://192.168.1.5:3000/remote
  3. Phone must be on the SAME Wi-Fi as the PC - turn OFF mobile data.
  4. College Wi-Fi often blocks phone-to-PC connections. Then use a hotspot:
     turn on the PHONE's hotspot, connect the PC to it, restart START.bat,
     and use the new address shown.

TROUBLESHOOTING
  - Phone cannot open the page: Windows Firewall blocked it.
    Control Panel > Windows Defender Firewall > Allow an app > tick
    "Node.js JavaScript Runtime" for Private networks.
  - The black window says "Browser for the show: NOT FOUND": install Chrome.
