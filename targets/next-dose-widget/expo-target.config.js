/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'NextDoseWidget',
  displayName: 'Next Dose',
  deploymentTarget: '16.0',
  entitlements: {
    'com.apple.security.application-groups': [`group.${config.ios.bundleIdentifier}`],
  },
  colors: {
    $accent: { color: '#1FA2A6', darkColor: '#1FA2A6' },
    $widgetBackground: { color: '#FFFFFF', darkColor: '#1C1C1E' },
  },
  frameworks: ['SwiftUI', 'WidgetKit'],
});
