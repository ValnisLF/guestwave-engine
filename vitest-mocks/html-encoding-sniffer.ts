// minimal stub to avoid ESM import issues during tests
export default function htmlEncodingSniffer(uint8Array: Uint8Array, options?: any) {
  // for test purposes assume UTF-8 always
  return 'UTF-8';
}
