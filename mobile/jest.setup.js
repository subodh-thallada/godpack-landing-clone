// Jest setup: in-memory AsyncStorage for the persisted stores and a light
// Reanimated stand-in (see test/reanimated-mock.js).
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => require('./test/reanimated-mock'));
