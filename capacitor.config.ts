import type { CapacitorConfig } from '@capacitor/cli'

/**
 * The iOS app wraps the same built web app (`dist/`), bundled inside the app so
 * it opens instantly and works offline. See docs/APP_STORE_RELEASE.md.
 */
const config: CapacitorConfig = {
  // Permanent once the app is uploaded to App Store Connect. Change it before then if you prefer another.
  appId: 'io.github.aaravbuddhadev.riverline',
  appName: 'Riverline',
  webDir: 'dist',
  // Matches the app's dark background, so nothing flashes white while it starts.
  backgroundColor: '#0F1412',
  ios: {
    // Let the page draw under the status bar and home indicator; the CSS pads
    // content with the safe-area insets.
    contentInset: 'never',
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      // The app hides the native splash itself once the first screen is ready (src/native).
      launchAutoHide: false,
      backgroundColor: '#0F1412',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
    },
  },
}

export default config
