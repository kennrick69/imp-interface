// preload.js — bridge segura entre main (Node) e renderer (Chromium).
// contextIsolation:true + esta API expõe APENAS o necessário.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  tmux: {
    check:        () => ipcRenderer.invoke('tmux:check'),
    sessions:     () => ipcRenderer.invoke('tmux:sessions'),
    panes:        (session) => ipcRenderer.invoke('tmux:panes', session),
    sendKeys:     (opts) => ipcRenderer.invoke('tmux:sendKeys', opts),
    capturePane:  (opts) => ipcRenderer.invoke('tmux:capturePane', opts),
  },
  chat: {
    start: (opts) => ipcRenderer.invoke('chat:start', opts),
    stop:  () => ipcRenderer.invoke('chat:stop'),
    onUpdate: (cb) => {
      const wrapped = (_evt, payload) => cb(payload);
      ipcRenderer.on('chat:update', wrapped);
      return () => ipcRenderer.removeListener('chat:update', wrapped);
    }
  },
  squad: {
    listAgents:   () => ipcRenderer.invoke('squad:listAgents'),
    readPersona:  (dir) => ipcRenderer.invoke('squad:readPersona', dir),
    createPersona:(data) => ipcRenderer.invoke('squad:createPersona', data),
  },
  orchestrator: {
    listConfigs:  () => ipcRenderer.invoke('orchestrator:listConfigs'),
    readConfig:   (name) => ipcRenderer.invoke('orchestrator:readConfig', name),
  },
  meta: {
    get3DUrl:     () => ipcRenderer.invoke('meta:get3DUrl'),
  },
  // v0.3: env + config persistido + shell
  env: {
    get:     () => ipcRenderer.invoke('env:get'),
    refresh: () => ipcRenderer.invoke('env:refresh'),
  },
  config: {
    save:       (partial) => ipcRenderer.invoke('config:save', partial),
    pickFolder: (opts) => ipcRenderer.invoke('config:pickFolder', opts || {}),
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  },
  clipboard: {
    savePastedImage: (arrayBuffer, ext) =>
      ipcRenderer.invoke('clipboard:savePastedImage', { buffer: arrayBuffer, ext }),
  },
});
