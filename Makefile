# Define the test files
TEST_FILES := test_upload_binary.py test_utils.py test_github_utils.py

# Define the default target
.PHONY: test
test:
	pytest $(TEST_FILES)
	
