const { NodeSSH } = require('node-ssh');
const path = require('path');

const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log('Connecting to VPS...');
    await ssh.connect({
      host: '93.127.166.207',
      username: 'root',
      password: 'Vasu@201067#'
    });
    console.log('Connected!');

    const localServerPath = path.resolve(__dirname, '../server');
    const remoteServerPath = '/var/www/badoneerp/server';

    console.log('Uploading files...');
    
    // We only upload specific files/folders to save time and avoid node_modules/.env issues
    const itemsToUpload = [
      'controllers',
      'routes',
      'config',
      'services',
      'package.json',
      'server.js',
      'syncNumberPlates.js'
    ];

    for (const item of itemsToUpload) {
      const localPath = path.join(localServerPath, item);
      const remotePath = `${remoteServerPath}/${item}`;
      console.log(`Uploading ${item}...`);
      
      const fs = require('fs');
      if (fs.statSync(localPath).isDirectory()) {
        await ssh.putDirectory(localPath, remotePath, {
          recursive: true,
          concurrency: 5
        });
      } else {
        await ssh.putFile(localPath, remotePath);
      }
    }
    
    console.log('Upload complete. Running commands on server...');

    const commands = [
      'cd /var/www/badoneerp/server',
      'npm install',
      'node syncNumberPlates.js',
      'pm2 restart all'
    ];

    for (const cmd of commands) {
      console.log(`Executing: ${cmd}`);
      const result = await ssh.execCommand(cmd, { cwd: '/var/www/badoneerp/server' });
      console.log('STDOUT:', result.stdout);
      if (result.stderr) console.error('STDERR:', result.stderr);
    }

    console.log('Deployment completely finished!');
    ssh.dispose();
  } catch (error) {
    console.error('Deployment failed:', error);
    ssh.dispose();
  }
}

deploy();
