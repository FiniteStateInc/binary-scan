import unittest
from unittest.mock import MagicMock, patch

from upload_binary import create_and_upload_binary


class TestCreateAndUploadBinary(unittest.TestCase):
    @patch("upload_binary.os.environ")
    @patch("upload_binary.finite_state_sdk")
    @patch("upload_binary.set_multiline_output")
    @patch("upload_binary.set_output")
    @patch("upload_binary.logging.getLogger")
    def test_create_and_upload_binary_success(
        self,
        mock_logger,
        mock_set_output,
        mock_set_multiline_output,
        mock_sdk,
        mock_environ,
    ):
        # Set up mock values
        mock_logger_instance = MagicMock()
        mock_logger.return_value = mock_logger_instance
        mock_environ.get.side_effect = lambda key: {
            "INPUT_FINITE_STATE_CLIENT_ID": "your_client_id",
            "INPUT_FINITE_STATE_SECRET": "your_secret",
            "INPUT_FINITE_ORGANIZATION_CONTEXT": "org_context",
            "INPUT_ASSET_ID": 123456,
            "INPUT_VERSION": 1,
            "INPUT_FILE_PATH": "./test.bin",
        }.get(key)

        # Mock the finite_state_sdk methods and responses as needed
        mock_token = "mock_token"
        mock_sdk.get_auth_token.return_value = mock_token
        mock_sdk.create_new_asset_version_and_upload_binary.return_value = {
            "launchBinaryUploadProcessing": {
                "key": "test_results/org=03b5e17b-aeda-42d4-9f2c-aeb144d96a93/asset_version=2722350854/08a3d2b9-c9a3-4b19-ab9b-d5237c7b952c"
            }
        }

        # Run the function
        create_and_upload_binary()

        # Add assertions based on the expected behavior
        mock_set_multiline_output.assert_called_once()
        mock_set_output.assert_called_once_with(
            "asset-version-url",
            "https://platform.finitestate.io/artifacts/123456/versions/2722350854",
        )

    @patch("upload_binary.os.environ")
    @patch("upload_binary.finite_state_sdk")
    @patch("upload_binary.set_multiline_output")
    @patch("upload_binary.set_output")
    @patch("upload_binary.logging.getLogger")
    def test_create_and_upload_binary_failure(
        self,
        mock_logger,
        mock_set_output,
        mock_set_multiline_output,
        mock_sdk,
        mock_environ,
    ):
        # Set up mock values
        mock_logger_instance = MagicMock()
        mock_logger.return_value = mock_logger_instance
        mock_environ.get.side_effect = lambda key: {
            "INPUT_FINITE_STATE_CLIENT_ID": "your_client_id",
            "INPUT_FINITE_STATE_SECRET": "your_secret",
            "INPUT_FINITE_ORGANIZATION_CONTEXT": "org_context",
            "INPUT_ASSET_ID": 123456,
            "INPUT_VERSION": 1,
            "INPUT_FILE_PATH": "./test.bin",
        }.get(key)

        # Mock the finite_state_sdk methods and responses as needed
        mock_sdk.get_auth_token.side_effect = Exception("Simulated failure")

        # Run the function
        create_and_upload_binary()

        # Add assertions based on the expected behavior
        mock_set_multiline_output.assert_called_once_with(
            "error",
            "Caught an exception trying to get and auth token on Finite State: Simulated failure",
        )
        mock_set_output.assert_not_called()


if __name__ == "__main__":
    unittest.main()
