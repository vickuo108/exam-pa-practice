"""Send secrets to Cloudflare through stdin; never save the OpenAI key locally."""
import argparse
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pages_key import load_key

parser = argparse.ArgumentParser()
parser.add_argument('--pages', required=True)
parser.add_argument('--access-code-file', required=True)
args = parser.parse_args()
key = load_key(args.pages)
code_path = Path(args.access_code_file).resolve()
if code_path.is_relative_to(ROOT):
    raise SystemExit('Access code must be outside the repository.')
if code_path.exists():
    code = code_path.read_text().strip()
else:
    code = secrets.token_urlsafe(24)
    fd = os.open(code_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as f:
        f.write(code + '\n')
if len(code) < 24:
    raise SystemExit('Access code must contain at least 24 characters.')
result = subprocess.run(
    ['wrangler', 'secret', 'bulk'], cwd=ROOT,
    input=json.dumps({'OPENAI_API_KEY': key, 'PA_ACCESS_CODE': code}),
    text=True, capture_output=True,
)
# Redact even unexpected CLI output before it can reach logs or the conversation.
output = (result.stdout + result.stderr).replace(key, '[REDACTED]').replace(code, '[REDACTED]')
print(output)
raise SystemExit(result.returncode)
