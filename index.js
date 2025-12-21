/**
 * @format
 */
import 'react-native-url-polyfill/auto';
import '@walletconnect/react-native-compat';
import {AppRegistry} from 'react-native';
import App from './src_clean/AppRoot';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
