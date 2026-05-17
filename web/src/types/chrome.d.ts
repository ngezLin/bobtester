// Type declarations for Chrome Extension API
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (
          extensionId: string,
          message: any,
          callback?: (response: any) => void
        ) => void;
        lastError?: {
          message?: string;
        };
      };
    };
  }
}

export {};

// Made with Bob
