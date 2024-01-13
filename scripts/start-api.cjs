const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Assuming Backend directory is at the same level as scripts directory
const backendPath = path.join(__dirname, '..', 'Backend');
const venvPath = path.join(backendPath, 'venv');

console.log('Current working directory:', __dirname);
console.log('Content of the directory:', fs.readdirSync(__dirname));

const activateScript = process.platform === 'win32' ? 'activate.bat' : 'bin/activate';

const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';

const venvCommand = process.platform === 'win32'
  ? `${pythonExecutable} -m venv venv`
  : `${pythonExecutable} -m venv venv && . ${venvPath}/${activateScript}`;

execSync(`cd ${backendPath} && ${venvCommand} && pip install -r requirements.txt && uvicorn main:app --reload`, { stdio: 'inherit' });
