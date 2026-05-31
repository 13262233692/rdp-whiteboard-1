const WebSocket = require('ws');
const net = require('net');

class VNCProxy {
  constructor(vncHost, vncPort) {
    this.vncHost = vncHost;
    this.vncPort = vncPort;
    this.connections = new Map();
  }

  handleConnection(ws) {
    const vncSocket = net.connect(this.vncPort, this.vncHost, () => {
      console.log('Connected to VNC server');
    });

    const connectionId = Date.now() + Math.random();
    this.connections.set(connectionId, { ws, vncSocket });

    ws.on('message', (data) => {
      if (vncSocket.writable) {
        vncSocket.write(data);
      }
    });

    vncSocket.on('data', (data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    ws.on('close', () => {
      vncSocket.end();
      this.connections.delete(connectionId);
      console.log('WebSocket disconnected, closing VNC connection');
    });

    vncSocket.on('close', () => {
      ws.close();
      this.connections.delete(connectionId);
      console.log('VNC connection closed');
    });

    vncSocket.on('error', (err) => {
      console.error('VNC socket error:', err);
      ws.close();
      this.connections.delete(connectionId);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      vncSocket.end();
      this.connections.delete(connectionId);
    });
  }

  closeAll() {
    this.connections.forEach(({ ws, vncSocket }) => {
      ws.close();
      vncSocket.end();
    });
    this.connections.clear();
  }
}

module.exports = VNCProxy;
