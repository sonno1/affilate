import os
import re
import subprocess
from pathlib import Path

# Project root = two levels up from this file (backend/services/ -> backend/ -> root)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ENV_FILE = PROJECT_ROOT / ".env"


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------

def _read_env_vars() -> dict:
    """Read all key=value pairs from .env file."""
    env_vars: dict[str, str] = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                env_vars[key.strip()] = value.strip()
    return env_vars


def _write_env_var(key: str, value: str) -> None:
    """Add or update a single key=value in .env, preserving all other content."""
    if ENV_FILE.exists():
        content = ENV_FILE.read_text(encoding="utf-8")
    else:
        content = ""

    pattern = rf"^{re.escape(key)}\s*=.*$"
    replacement = f"{key}={value}"
    if re.search(pattern, content, flags=re.MULTILINE):
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    else:
        content = content.rstrip("\n") + f"\n{replacement}\n"

    ENV_FILE.write_text(content, encoding="utf-8")
    # Refresh os.environ immediately so subsequent reads in the same process reflect changes
    os.environ[key] = value


def get_github_config() -> dict:
    """Return current GitHub config. Token is masked for security."""
    token = os.getenv("GITHUB_TOKEN", "")
    return {
        "username": os.getenv("GITHUB_USERNAME", ""),
        "repo": os.getenv("GITHUB_REPO", ""),
        "branch": os.getenv("GITHUB_BRANCH", "main"),
        "token_set": bool(token),
    }


def save_github_config(username: str, token: str, repo: str, branch: str) -> None:
    """Persist GitHub credentials to .env file."""
    _write_env_var("GITHUB_USERNAME", username)
    if token:  # Only overwrite token if a new one is supplied
        _write_env_var("GITHUB_TOKEN", token)
    _write_env_var("GITHUB_REPO", repo)
    _write_env_var("GITHUB_BRANCH", branch)


# ---------------------------------------------------------------------------
# Git operations
# ---------------------------------------------------------------------------

def _run_git(args: list[str], cwd: Path, env: dict | None = None) -> tuple[str, str]:
    """Run a git command, returning (stdout, stderr). Raises on non-zero exit."""
    result = subprocess.run(
        ["git"] + args,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        env=env,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout.strip(), result.stderr.strip()


def get_git_status() -> dict:
    """Return current git status and last commit info."""
    log_lines = []
    branch = ""
    status_out = ""
    is_repo = (PROJECT_ROOT / ".git").exists()

    if is_repo:
        try:
            status_out, _ = _run_git(["status", "--short"], PROJECT_ROOT)
        except Exception as e:
            status_out = str(e)

        try:
            branch_out, _ = _run_git(["rev-parse", "--abbrev-ref", "HEAD"], PROJECT_ROOT)
            branch = branch_out
        except Exception:
            branch = "—"

        try:
            log_out, _ = _run_git(
                ["log", "--oneline", "-5"], PROJECT_ROOT
            )
            log_lines = log_out.splitlines()
        except Exception:
            log_lines = []

    return {
        "is_repo": is_repo,
        "branch": branch,
        "status": status_out,
        "recent_commits": log_lines,
    }


def push_to_github(commit_message: str) -> dict:
    """
    Stage all changes, commit, and push to the configured GitHub repository.
    Returns a dict with log lines for the UI.
    """
    username = os.getenv("GITHUB_USERNAME", "")
    token = os.getenv("GITHUB_TOKEN", "")
    repo = os.getenv("GITHUB_REPO", "")
    branch = os.getenv("GITHUB_BRANCH", "main")

    if not all([username, token, repo]):
        raise ValueError("GitHub credentials not fully configured. Please save your config first.")

    # Build auth URL — token embedded for HTTPS auth (standard for CI use, never logged)
    remote_url = f"https://{username}:{token}@github.com/{username}/{repo}.git"
    # Safe URL (no token) for display in logs
    safe_url = f"https://github.com/{username}/{repo}"

    logs: list[str] = []

    # --- 1. Init repo if needed ---
    if not (PROJECT_ROOT / ".git").exists():
        _run_git(["init", "-b", branch], PROJECT_ROOT)
        logs.append(f"✅ Git repo initialised at {PROJECT_ROOT}")
    else:
        logs.append(f"✅ Repo found at {PROJECT_ROOT}")

    # --- 2. Configure user identity ---
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"

    _run_git(["config", "user.email", f"{username}@users.noreply.github.com"], PROJECT_ROOT, env)
    _run_git(["config", "user.name", username], PROJECT_ROOT, env)

    # --- 3. Ensure .gitignore exists ---
    gitignore = PROJECT_ROOT / ".gitignore"
    if not gitignore.exists():
        gitignore.write_text(
            "# Python\n__pycache__/\n*.pyc\n*.pyo\n*.pyd\n.Python\n*.egg-info/\n"
            "dist/\nbuild/\n\n# Env & secrets\n.env\n*.env\n\n"
            "# Database\n*.db\n*.sqlite\n\n# Node\nnode_modules/\n.npm\n\n"
            "# Vite build\ndist/\n\n# OS\n.DS_Store\nThumbs.db\n",
            encoding="utf-8",
        )
        logs.append("✅ .gitignore created")

    # --- 4. Stage all changes ---
    _run_git(["add", "-A"], PROJECT_ROOT, env)
    logs.append("✅ All changes staged (git add -A)")

    # --- 5. Commit (skip if nothing to commit) ---
    status_out, _ = _run_git(["status", "--porcelain"], PROJECT_ROOT, env)
    if status_out:
        _run_git(["commit", "-m", commit_message], PROJECT_ROOT, env)
        logs.append(f"✅ Committed: \"{commit_message}\"")
    else:
        logs.append("ℹ️ Nothing new to commit — working tree clean")

    # --- 6. Set / update remote ---
    remote_check = subprocess.run(
        ["git", "remote", "get-url", "origin"],
        cwd=str(PROJECT_ROOT), capture_output=True, text=True, env=env
    )
    if remote_check.returncode == 0:
        _run_git(["remote", "set-url", "origin", remote_url], PROJECT_ROOT, env)
    else:
        _run_git(["remote", "add", "origin", remote_url], PROJECT_ROOT, env)
    logs.append(f"✅ Remote origin → {safe_url}")

    # --- 7. Push ---
    _run_git(["push", "-u", "origin", branch, "--force"], PROJECT_ROOT, env)
    logs.append(f"🚀 Pushed to {safe_url} (branch: {branch})")

    return {"success": True, "logs": logs, "repo_url": safe_url}
