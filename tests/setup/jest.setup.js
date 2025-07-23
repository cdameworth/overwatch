// Jest setup file for unit and integration tests
require('@testing-library/jest-dom');

// Mock D3.js for unit tests
const d3Mock = {
  select: jest.fn().mockReturnThis(),
  selectAll: jest.fn().mockReturnThis(),
  append: jest.fn().mockReturnThis(),
  attr: jest.fn().mockReturnThis(),
  style: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  html: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  call: jest.fn().mockReturnThis(),
  datum: jest.fn().mockReturnThis(),
  data: jest.fn().mockReturnThis(),
  enter: jest.fn().mockReturnThis(),
  exit: jest.fn().mockReturnThis(),
  remove: jest.fn().mockReturnThis(),
  merge: jest.fn().mockReturnThis(),
  transition: jest.fn().mockReturnThis(),
  duration: jest.fn().mockReturnThis(),
  ease: jest.fn().mockReturnThis(),
  scaleOrdinal: jest.fn(() => jest.fn()),
  schemeCategory10: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'],
  zoom: jest.fn(() => ({
    scaleExtent: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
  })),
  zoomIdentity: { k: 1, x: 0, y: 0 },
  forceSimulation: jest.fn(() => ({
    nodes: jest.fn().mockReturnThis(),
    force: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    alpha: jest.fn().mockReturnThis(),
    alphaTarget: jest.fn().mockReturnThis(),
    restart: jest.fn().mockReturnThis(),
  })),
  forceLink: jest.fn(() => ({
    id: jest.fn().mockReturnThis(),
    distance: jest.fn().mockReturnThis(),
  })),
  forceManyBody: jest.fn(() => ({
    strength: jest.fn().mockReturnThis(),
  })),
  forceCenter: jest.fn(),
  forceX: jest.fn(),
  forceY: jest.fn(),
  drag: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
  })),
  event: {
    x: 0,
    y: 0,
    pageX: 100,
    pageY: 100,
    target: null,
    currentTarget: null,
  },
};

// Make D3 available globally for tests
global.d3 = d3Mock;

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock window.requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 16); // ~60fps
});

global.cancelAnimationFrame = jest.fn();

// Mock SVG elements for jsdom
Object.defineProperty(window.SVGElement.prototype, 'getBBox', {
  value: () => ({ x: 0, y: 0, width: 100, height: 100 }),
  configurable: true,
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
  }
  
  observe() {
    return null;
  }
  
  disconnect() {
    return null;
  }
  
  unobserve() {
    return null;
  }
};

// Setup DOM cleanup after each test
afterEach(() => {
  // Clear any timers that might have been set
  jest.clearAllTimers();
  
  // Clean up DOM
  document.body.innerHTML = '';
  
  // Clear console mocks
  jest.clearAllMocks();
});

// Increase timeout for tests that need more time
jest.setTimeout(30000);