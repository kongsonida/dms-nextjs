import net from 'net';
import path from 'path';

const CLAMAV_HOST = process.env.CLAMAV_HOST || 'localhost';
const CLAMAV_PORT = parseInt(process.env.CLAMAV_PORT || '3310', 10);

interface ScanResult {
  isClean: boolean;
  virusName?: string;
  error?: string;
}

export async function scanFile(filePath: string): Promise<ScanResult> {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let response = '';

    const timeout = setTimeout(() => {
      client.destroy();
      resolve({ isClean: false, error: 'Scan timeout' });
    }, 30000); // 30 second timeout

    client.connect(CLAMAV_PORT, CLAMAV_HOST, () => {
      // Send SCAN command with the file path
      client.write(`SCAN ${path.resolve(filePath)}\n`);
    });

    client.on('data', (data) => {
      response += data.toString();
    });

    client.on('close', () => {
      clearTimeout(timeout);

      // Parse ClamAV response
      // Format: /path/to/file: OK or /path/to/file: VirusName FOUND
      const lines = response.trim().split('\n');
      const lastLine = lines[lines.length - 1];

      if (lastLine.includes('OK')) {
        resolve({ isClean: true });
      } else if (lastLine.includes('FOUND')) {
        const match = lastLine.match(/: (.+) FOUND/);
        resolve({
          isClean: false,
          virusName: match ? match[1] : 'Unknown threat',
        });
      } else if (lastLine.includes('ERROR')) {
        resolve({
          isClean: false,
          error: lastLine,
        });
      } else {
        resolve({
          isClean: true,
          error: 'Unknown response from scanner',
        });
      }
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        isClean: false,
        error: `Connection error: ${err.message}`,
      });
    });
  });
}

export async function scanBuffer(buffer: Buffer): Promise<ScanResult> {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let response = '';

    const timeout = setTimeout(() => {
      client.destroy();
      resolve({ isClean: false, error: 'Scan timeout' });
    }, 30000);

    client.connect(CLAMAV_PORT, CLAMAV_HOST, () => {
      // Send INSTREAM command
      client.write('zINSTREAM\0');

      // Send data in chunks
      const chunkSize = 2048;
      for (let i = 0; i < buffer.length; i += chunkSize) {
        const chunk = buffer.slice(i, i + chunkSize);
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length, 0);
        client.write(size);
        client.write(chunk);
      }

      // Send terminator (zero-length chunk)
      const terminator = Buffer.alloc(4);
      terminator.writeUInt32BE(0, 0);
      client.write(terminator);
    });

    client.on('data', (data) => {
      response += data.toString();
    });

    client.on('close', () => {
      clearTimeout(timeout);

      // Parse response
      const cleanedResponse = response.replace(/\0/g, '').trim();

      if (cleanedResponse.includes('OK')) {
        resolve({ isClean: true });
      } else if (cleanedResponse.includes('FOUND')) {
        const match = cleanedResponse.match(/: (.+) FOUND/);
        resolve({
          isClean: false,
          virusName: match ? match[1] : 'Unknown threat',
        });
      } else if (cleanedResponse.includes('INSTREAM size limit exceeded')) {
        resolve({
          isClean: false,
          error: 'File too large for scanning',
        });
      } else {
        resolve({
          isClean: true,
          error: 'Unknown response from scanner',
        });
      }
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        isClean: false,
        error: `Connection error: ${err.message}`,
      });
    });
  });
}

export async function pingClamAV(): Promise<boolean> {
  return new Promise((resolve) => {
    const client = new net.Socket();

    const timeout = setTimeout(() => {
      client.destroy();
      resolve(false);
    }, 5000);

    client.connect(CLAMAV_PORT, CLAMAV_HOST, () => {
      client.write('PING\n');
    });

    client.on('data', (data) => {
      clearTimeout(timeout);
      client.destroy();
      resolve(data.toString().trim() === 'PONG');
    });

    client.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

export async function getClamAVVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    const client = new net.Socket();

    const timeout = setTimeout(() => {
      client.destroy();
      resolve(null);
    }, 5000);

    client.connect(CLAMAV_PORT, CLAMAV_HOST, () => {
      client.write('VERSION\n');
    });

    client.on('data', (data) => {
      clearTimeout(timeout);
      client.destroy();
      resolve(data.toString().trim());
    });

    client.on('error', () => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

export async function reloadClamAV(): Promise<boolean> {
  return new Promise((resolve) => {
    const client = new net.Socket();

    const timeout = setTimeout(() => {
      client.destroy();
      resolve(false);
    }, 10000);

    client.connect(CLAMAV_PORT, CLAMAV_HOST, () => {
      client.write('RELOAD\n');
    });

    client.on('data', (data) => {
      clearTimeout(timeout);
      client.destroy();
      resolve(data.toString().trim() === 'RELOADING');
    });

    client.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}
