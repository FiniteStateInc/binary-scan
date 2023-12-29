import os
import requests
import json
import re


def extract_pull_request_number():
    if is_pull_request():
        match = re.search(r"/pull/(\d+)/", os.environ.get("GITHUB_REF"))
        if match:
            return match.group(1)
        else:
            return None
    return None


def extract_repository_owner():
    return os.environ.get("GITHUB_REPOSITORY_OWNER")


def extract_repository_name():
    GITHUB_REPOSITORY = os.environ.get("GITHUB_REPOSITORY")
    if not GITHUB_REPOSITORY:
        return None
    # Split the URL using "/" and get the last element
    parts = GITHUB_REPOSITORY.split("/")
    if len(parts) >= 2:
        return parts[-1]
    else:
        return None


def is_pull_request():
    return os.environ.get("GITHUB_EVENT_NAME") == "pull_request"


def comment_on_pr(comment, github_token, pr_number, repo_owner, repo_name):
    github_api_url = os.environ.get("GITHUB_API_URL")
    url = f"{github_api_url}/repos/{repo_owner}/{repo_name}/issues/{pr_number}/comments"
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json",
    }
    data = {"body": comment}
    response = requests.post(url, headers=headers, data=json.dumps(data))
    return response
