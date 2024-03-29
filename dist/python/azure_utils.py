from azure.devops.connection import Connection
from msrest.authentication import BasicAuthentication
import re


def is_pull_request(branch_name):
    pattern = r"^refs/pull/(\d+)/merge$"
    match = re.match(pattern, branch_name)
    return bool(match)


def extract_pull_request_number(branch_name):
    pattern = r"^refs/pull/(\d+)/merge$"
    match = re.match(pattern, branch_name)
    if match:
        return int(match.group(1))
    else:
        return None


def comment_on_pr(
    logger,
    comment,
    organization_url,
    azure_path_token,
    project_name,
    repository_name,
    source_branch,
):
    if not is_pull_request(source_branch):
        error_text = f"This is not a pull request - aborting comment - {source_branch}"
        logger.info(logger.info(error_text))
        return {"status_code": 500, "text": error_text}

    pull_request_id = extract_pull_request_number(source_branch)

    # Comment text
    comment_text = {
        "comments": [
            {"content": comment, "commentType": "system", "comment_type": "system"}
        ],
        "status": "closed",
    }

    # Create a connection to the Azure DevOps organization
    credentials = BasicAuthentication("", azure_path_token)
    connection = Connection(base_url=organization_url, creds=credentials)

    # Get the pull request details
    git_client = connection.clients.get_git_client()
    repository = git_client.get_repository(repository_name, project=project_name)

    # Add a comment to the pull request
    try:
        comment_thread = git_client.create_thread(
            comment_thread=comment_text,
            repository_id=repository.id,
            pull_request_id=pull_request_id,
        )
        # Print the comment details
        logger.debug(comment_thread.as_dict())
        return {"status_code": 201}
    except Exception as e:
        error_text = f"Error createing thread: {e}"
        logger.error(error_text)
        return {"status_code": 500, "text": error_text}
