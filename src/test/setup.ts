import '@testing-library/jest-dom';

// Mock environment variables for tests
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_GEMINI_API_KEY_1: 'test-key-1',
    VITE_GEMINI_API_KEY_2: 'test-key-2',
    VITE_RATE_LIMIT_PER_MINUTE: '10',
    VITE_RATE_LIMIT_PER_DAY: '70',
    VITE_CONCURRENT_REQUESTS: '5',
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock URL.createObjectURL and revokeObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
  value: jest.fn(() => 'mocked-url'),
});

Object.defineProperty(window.URL, 'revokeObjectURL', {
  value: jest.fn(),
});

// Mock fetch
global.fetch = jest.fn();
