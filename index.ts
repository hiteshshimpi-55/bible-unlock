import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';

import App from './App';
import GateScreen from './src/GateScreen';

// "main" = setup/settings (MainActivity); "gate" = the verse lock (GateActivity, over the lock screen).
registerRootComponent(App);
AppRegistry.registerComponent('gate', () => GateScreen);
