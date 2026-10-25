// Jest setup: in-memory AsyncStorage for the persisted stores and a light
// Reanimated stand-in (see test/reanimated-mock.js), plus the keyboard
// controller's own Jest mock.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => require('./test/reanimated-mock'));
jest.mock('react-native-keyboard-controller', () => require('react-native-keyboard-controller/jest'));
