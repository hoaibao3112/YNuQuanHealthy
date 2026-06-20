const { execSync } = require('child_process');

const ports = [3000, 3001];

console.log('=== Checking and cleaning up ports 3000 and 3001 ===');

for (const port of ports) {
  try {
    let output = '';
    if (process.platform === 'win32') {
      try {
        output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      } catch (e) {
        // findstr returns non-zero code if port is not in use, which throws in execSync
        continue;
      }
      
      const lines = output.split('\n').map(line => line.trim()).filter(Boolean);
      const pids = new Set();
      
      for (const line of lines) {
        const parts = line.split(/\s+/);
        // The last element is the PID
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== '0') {
          pids.add(parseInt(pid, 10));
        }
      }
      
      for (const pid of pids) {
        console.log(`Killing process ${pid} using port ${port}...`);
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'inherit' });
        } catch (err) {
          console.error(`Failed to kill process ${pid}:`, err.message);
        }
      }
    } else {
      // Unix/macOS fallback
      try {
        execSync(`lsof -t -i:${port} | xargs kill -9`, { stdio: 'inherit' });
        console.log(`Killed processes using port ${port}`);
      } catch (e) {
        // Ignore errors if port is not in use
      }
    }
  } catch (err) {
    console.error(`Error checking port ${port}:`, err.message);
  }
}
console.log('=== Port cleanup completed. ===');
