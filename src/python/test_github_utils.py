import unittest
from unittest.mock import patch
import os
from github_utils import (
    extract_pull_request_number,
    extract_repository_owner,
    extract_repository_name,
    is_pull_request,
    comment_on_pr,
)


class TestGithubUtils(unittest.TestCase):
    @patch.dict(
        os.environ,
        {"GITHUB_EVENT_NAME": "pull_request", "GITHUB_REF": "refs/pull/42/merge"},
    )
    def test_extract_pull_request_number(self):
        result = extract_pull_request_number()
        self.assertEqual(result, "42")

    @patch.dict(os.environ, {"GITHUB_REPOSITORY_OWNER": "owner"})
    def test_extract_repository_owner(self):
        result = extract_repository_owner()
        self.assertEqual(result, "owner")

    @patch.dict(os.environ, {"GITHUB_REPOSITORY": "owner/repo"})
    def test_extract_repository_name(self):
        result = extract_repository_name()
        self.assertEqual(result, "repo")

    @patch.dict(os.environ, {"GITHUB_EVENT_NAME": "pull_request"})
    def test_is_pull_request(self):
        result = is_pull_request()
        self.assertTrue(result)

    @patch("requests.post", return_value="mocked_response")
    @patch.dict(
        os.environ,
        {"GITHUB_API_URL": "https://api.github.com", "GITHUB_TOKEN": "your_token"},
    )
    def test_comment_on_pr(self, mock_post):
        comment = "Test comment"
        pr_number = "42"
        repo_owner = "owner"
        repo_name = "repo"
        result = comment_on_pr(comment, "your_token", pr_number, repo_owner, repo_name)
        self.assertEqual(result, "mocked_response")


if __name__ == "__main__":
    unittest.main()
