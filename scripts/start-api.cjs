const { execSync } = require('child_process');
execSync('cd Backend/ && python3 -m venv venv && . venv/bin/activate && pip install -r requirements.txt && . venv/bin/activate && uvicorn main:app --reload', { stdio: 'inherit' });
