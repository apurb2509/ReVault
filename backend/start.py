import subprocess
import time
import urllib.request
import json
import re
import os
import sys
import threading

def update_env_file(ngrok_url):
    env_path = ".env"
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        if "NGROK_PUBLIC_URL=" in content:
            content = re.sub(r'NGROK_PUBLIC_URL=.*', f'NGROK_PUBLIC_URL="{ngrok_url}"', content)
        else:
            content += f'\nNGROK_PUBLIC_URL="{ngrok_url}"\n'
            
        with open(env_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[SYSTEM] Updated backend/.env with NGROK_PUBLIC_URL={ngrok_url}")
    except Exception as e:
        print(f"[SYSTEM] Failed to update .env: {e}")

def prefix_output(process, prefix):
    try:
        for line in iter(process.stdout.readline, b''):
            decoded_line = line.decode('utf-8', errors='replace').rstrip()
            print(f"[{prefix}] {decoded_line}", flush=True)
    except Exception:
        pass

def main():
    print("==========================================")
    print("  Starting ReVault Unified Backend...     ")
    print("==========================================")
    
    # No Docker needed; relies on managed Supabase/Redis configured in .env
    
    # 1. Start Ngrok
    print("[SYSTEM] Launching Ngrok on port 8000...")
    ngrok_proc = subprocess.Popen(
        ["ngrok", "http", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
    )
    
    # Wait for Ngrok API to start
    time.sleep(4)
    
    # 2. Fetch Ngrok URL
    ngrok_url = ""
    try:
        req = urllib.request.Request("http://127.0.0.1:4040/api/tunnels")
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            for t in data.get("tunnels", []):
                if t.get("proto") == "https":
                    ngrok_url = t.get("public_url")
                    break
    except Exception as e:
        print(f"[SYSTEM] Could not fetch Ngrok URL automatically: {e}")
        
    if ngrok_url:
        print(f"[SYSTEM] Auto-discovered Ngrok URL: {ngrok_url}")
        update_env_file(ngrok_url)
    
    # 3. Start Uvicorn
    print("[SYSTEM] Launching Uvicorn FastApi Server...")
    # Using the venv python executable
    venv_python = os.path.join("venv", "Scripts", "python.exe")
    if not os.path.exists(venv_python):
        venv_python = sys.executable

    uvicorn_proc = subprocess.Popen(
        [venv_python, "-m", "uvicorn", "main:app", "--reload"],
        cwd=".",
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT
    )
    
    # Wait for Uvicorn to boot before starting batch runner
    time.sleep(3)
    
    # 4. Start Redis Worker Daemon
    print("[SYSTEM] Launching Redis Worker Daemon...")
    worker_proc = subprocess.Popen(
        [venv_python, "services/redis_worker.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT
    )
    
    # Wait for the worker to connect to Redis
    time.sleep(3)
    
    # 5. Automatically trigger the Batch Producer (simulate the 400 events)
    print("[SYSTEM] Launching Batch Producer to inject 400 events...")
    batch_proc = subprocess.Popen(
        [venv_python, "batch/batch_runner.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT
    )
    
    # Stream logs
    threading.Thread(target=prefix_output, args=(ngrok_proc, "NGROK"), daemon=True).start()
    threading.Thread(target=prefix_output, args=(uvicorn_proc, "API  "), daemon=True).start()
    threading.Thread(target=prefix_output, args=(worker_proc, "WORKER"), daemon=True).start()
    threading.Thread(target=prefix_output, args=(batch_proc, "BATCH"), daemon=True).start()
    
    try:
        uvicorn_proc.wait()
    except KeyboardInterrupt:
        print("\n[SYSTEM] Shutting down all processes...")
        uvicorn_proc.terminate()
        worker_proc.terminate()
        try:
            batch_proc.terminate()
        except:
            pass
        ngrok_proc.terminate()

if __name__ == "__main__":
    main()
