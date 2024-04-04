import os
import re
import uuid

from github_utils import (
    comment_on_pr,
    extract_pull_request_number,
    extract_repository_name,
    extract_repository_owner,
    is_pull_request,
)


def set_multiline_output(name, value):
    with open(os.environ["GITHUB_OUTPUT"], "a") as fh:
        delimiter = uuid.uuid1()
        print(f"{name}<<{delimiter}", file=fh)
        print(value, file=fh)
        print(delimiter, file=fh)


def set_output(name, value):
    with open(os.environ["GITHUB_OUTPUT"], "a") as fh:
        print(f"{name}={value}", file=fh)


def extract_asset_version(input_string):
    # Define a regular expression pattern to match the asset_version value
    pattern = r"asset_version=(\d+)"

    # Use re.search to find the first match in the input string
    match = re.search(pattern, input_string)

    # Check if a match was found and extract the value
    if match:
        asset_version_value = match.group(1)
        return asset_version_value
    else:
        return None  # Return None if asset version value is not found


def generate_comment(github_token, asset_version_url, logger):
    pull_request_number = extract_pull_request_number()
    repo_owner = extract_repository_owner()
    repo_name = extract_repository_name()
    comment = (
        "**Hello**, Finite State is analyzing your files! :rocket:. \n"
        "Please, [click here]({asset_version_url}) to see the progress of the analysis."
        "<br />\n"
        "[Finite State](https://platform.finitestate.io/)"
    )

    formatted_comment = comment.format(asset_version_url=asset_version_url)
    response = comment_on_pr(
        formatted_comment, github_token, pull_request_number, repo_owner, repo_name
    )
    if response.status_code == 201:
        logger.info("Comment posted successfully")
    else:
        logger.error(
            f"Failed to post comment. Status code: {response.status_code} {response.text}"
        )
        logger.debug(response)
