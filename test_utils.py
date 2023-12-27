import unittest
from unittest.mock import patch, mock_open
from utils import set_multiline_output, set_output, extract_asset_version


class TestUtilsFunctions(unittest.TestCase):
    def test_set_multiline_output(self):
        # Mocking the open function
        with patch("builtins.open", mock_open()) as mock_file:
            # Set environment variable
            with patch.dict("os.environ", {"GITHUB_OUTPUT": "mocked_output_file"}):
                # Call the function
                set_multiline_output("test_name", "test_value")

            # Assertions
            mock_file.assert_called_once_with("mocked_output_file", "a")

    def test_set_output(self):
        # Mocking the open function
        with patch("builtins.open", mock_open()) as mock_file:
            # Set environment variable
            with patch.dict("os.environ", {"GITHUB_OUTPUT": "mocked_output_file"}):
                # Call the function
                set_output("test_name", "test_value")

            # Assertions
            mock_file.assert_called_once_with("mocked_output_file", "a")

    def test_extract_asset_version(self):
        # Test case 1: Valid input string
        input_string = "test_results/org=03b5e17b-aeda-42d4-9f2c-aeb144d96a93/asset_version=2722350854/08a3d2b9-c9a3-4b19-ab9b-d5237c7b952c"
        result = extract_asset_version(input_string)
        self.assertEqual(result, "2722350854")

        # Test case 2: Invalid input string
        input_string = "some other string"
        result = extract_asset_version(input_string)
        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()
