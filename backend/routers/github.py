from fastapi import APIRouter, HTTPException
from schemas import GitHubConfigIn, GitHubConfigOut, GitHubPushIn, GitHubPushResult, GitHubStatusOut
from services import github_service

router = APIRouter(prefix="/github", tags=["github"])


@router.get("/config", response_model=GitHubConfigOut)
def get_config():
    """Return current GitHub config (token is never returned, only whether it is set)."""
    return github_service.get_github_config()


@router.post("/config", response_model=GitHubConfigOut)
def save_config(body: GitHubConfigIn):
    """Save GitHub credentials to the server .env file."""
    try:
        github_service.save_github_config(
            username=body.username,
            token=body.token or "",
            repo=body.repo,
            branch=body.branch,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return github_service.get_github_config()


@router.get("/status", response_model=GitHubStatusOut)
def git_status():
    """Return git status of the project: branch, changed files, recent commits."""
    try:
        return github_service.get_git_status()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/push", response_model=GitHubPushResult)
def push(body: GitHubPushIn):
    """Stage all changes, commit, and push to configured GitHub repository."""
    try:
        result = github_service.push_to_github(commit_message=body.commit_message)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Push failed: {exc}")
