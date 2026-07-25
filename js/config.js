/* =========================================================================
   config.js — sob global setting ekhane
   ========================================================================= */

const APP_CONFIG = {
  // Google Cloud Console > APIs & Services > Credentials theke paoa OAuth
  // Client ID. Ei ID ta public thakleo সমস্যা নেই — এটা secret na, GitHub
  // Pages e খোলা রাখা যায়। শুধু Console এ "Authorized JavaScript origins"
  // e tomar GitHub Pages URL (https://<username>.github.io) add korte hobe.
  GOOGLE_CLIENT_ID: '1086951640296-jrlskg8g6r2obe2ditsb1ocuph5ili4j.apps.googleusercontent.com',

  // Notun REST-based Drive sync e API key lage na (OAuth token diyei sob
  // request jay), tai eta ekhon optional. Khali rekhe dile o kono somossa
  // nei. Age-e chilo bole rekhe dilam, future e onno Google API (jemon
  // thumbnail generation) lagle kaje asbe.
  GOOGLE_API_KEY: 'AIzaSyDEG3yc1E_16M3eeOqsuDq8x98jN9AwpTQ',

  // Amra ei scope ta use korchi 'drive.appdata' er bodole — karon
  // drive.file scope diye app-created file gulo shoja-shuji user er
  // normal "My Drive" e ekta dedicated folder e dekha jay (EdrawMind er
  // dashboard er moto), r appdata hidden thake tai debug kora kothin hoy.
  GOOGLE_SCOPES: 'https://www.googleapis.com/auth/drive.file',

  // Drive e ei naam er folder e sob diagram save hobe (na thakle app
  // nijei create kore nibe first sign-in e).
  DRIVE_FOLDER_NAME: 'MindMapPro',

  // localStorage cache prefix — Drive save fail korleo kaj hariye jabe na
  LOCAL_CACHE_PREFIX: 'mmpro_cache_',
  LOCAL_INDEX_KEY: 'mmpro_local_index',

  AUTOSAVE_DEBOUNCE_MS: 1800,
  MAX_HISTORY: 60,
};
