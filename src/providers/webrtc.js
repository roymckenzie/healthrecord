import { WebrtcProvider } from 'y-webrtc';
import { doc } from './syncedstore';
import { computed, ref } from 'vue';
import { record } from '../store/record';

/** @type {WebrtcProvider | undefined} */
let webRTCProvider;

export const peers = ref(0);

export const webrtcConnected = computed(() => {
  return webRTCProvider !== null;
});

const setupWebRTCDocListeners = () => {

  // If user WebRTC preferences `signalerUrl` changes
  doc.on('update', () => {
    if (!webRTCProvider) return;
    if (!record.value.user.preferences) return;
    if (!record.value.user.preferences.webRTC.enabled) return;
    if (!record.value.user.preferences.webRTC.signalerUrl) return;
    if (webRTCProvider.signalingUrls.includes(record.value.user.preferences.webRTC.signalerUrl)) return;

    disconnect();
    connect();
  });

  // If user WebRTC preferences `enabled` state changes
  doc.on('update', () => {
    if (!record.value.user.preferences) return;
    if (!webRTCProvider && record.value.user.preferences.webRTC.enabled) {
      connect();
    } else if (webRTCProvider && !record.value.user.preferences.webRTC.enabled) {
      disconnect();
    }
  });
  
  doc.on('destroy', ()=> {
    disconnect();
    setupWebRTCDocListeners();
  });
}

setupWebRTCDocListeners();

const connect = () => {

  if (webRTCProvider && webRTCProvider.connected) return;

  const signaling = [];

  if (record.value.user.preferences.webRTC.signalerUrl) {
    signaling.push(record.value.user.preferences.webRTC.signalerUrl);
  } else if (import.meta.env.DEV) {
    // See {@link https://github.com/ferviddigital/y-webrtc-signaler y-webrtc-signaler} for sample signaling server implementation
    signaling.push('ws://localhost:8787');
  }

  const recordId = doc.getText('id').toString();

  webRTCProvider = new WebrtcProvider(recordId, doc, {
    signaling
  });

  webRTCProvider.on('peers', ({ webrtcPeers, bcPeers }) => {
    peers.value = webrtcPeers.length + bcPeers.length
  });
}

const disconnect = () => {
  if (!webRTCProvider) return;
  webRTCProvider.destroy();
  webRTCProvider.room.disconnect();
  webRTCProvider.disconnect();
  webRTCProvider = null;
  peers.value = 0;
}
