# Exif Location Data Detector
UserScript that dynamically detects location data within the EXIF headers of images loaded on a webpage and provides an interactive UI to view it.

## Disclaimer
This script is provided for educational and research purposes only. The extraction of EXIF metadata should be done ethically and with respect for personal privacy. This tool must not be used for doxxing, stalking, or any illegal and/or immoral activities.

## Features
* **Visual Markers:** Places a clickable 📍 marker on images containing embedded GPS coordinates.
* **Data Extraction:** Displays Latitude, Longitude, Altitude, a direct link to Google Maps, and other available EXIF metadata.
* **Customizable UI:** Set minimum image dimensions (300 x 300 px by default) and configure visual border highlights directly through the extension menu.
* **Processed locally:** All EXIF fetching and parsing is done entirely locally. No information, including images, is ever sent to external services.

## Notes
1. **Violentmonkey** is recommended, although it should work with other Userscript extensions.
2. The script will run in the background for all web pages. Tweak `@match` value in the Userscript header, or manually turn it on/off to limit its activity.

## Requirements
* Grants `GM_xmlhttpRequest` to bypass strict CORS policies and fetch binary image headers.
* Grants `GM_getValue`, `GM_setValue`, and `GM_registerMenuCommand` for persistent user settings.
