interface Window {
  webkit?: {
    messageHandlers: {
      cordova_iab: {
        postMessage: (message: string) => void;
      };
    };
  };
  get_pushid?: (pushId: string) => void;
  onNativeSTTResult?: ((text: string) => void) | null;
}
