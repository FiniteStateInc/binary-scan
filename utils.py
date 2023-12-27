import uuid
import re
import os

def set_multiline_output(name, value):
    with open(os.environ['GITHUB_OUTPUT'], 'a') as fh:
        delimiter = uuid.uuid1()
        print(f'{name}<<{delimiter}', file=fh)
        print(value, file=fh)
        print(delimiter, file=fh)

def set_output(name, value):
    with open(os.environ['GITHUB_OUTPUT'], 'a') as fh:
        print(f'{name}={value}', file=fh)

def extract_asset_version(input_string):
    # Define a regular expression pattern to match the asset_version value
    pattern = r'asset_version=(\d+)'

    # Use re.search to find the first match in the input string
    match = re.search(pattern, input_string)

    # Check if a match was found and extract the value
    if match:
        asset_version_value = match.group(1)
        return asset_version_value
    else:
        return None  # Return None if asset version value is not found
