import json
import logging
import logging.handlers
import os

import finite_state_sdk

from utils import (
    extract_asset_version,
    generate_comment,
    is_pull_request,
    set_multiline_output,
    set_output,
)

# configure a logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
logger_file_handler = logging.handlers.RotatingFileHandler(
    "status.log",
    maxBytes=1024 * 1024,
    backupCount=1,
    encoding="utf8",
)
# log to file
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger_file_handler.setFormatter(formatter)
logger.addHandler(logger_file_handler)

# log to console
consoleHandler = logging.StreamHandler()
consoleHandler.setFormatter(formatter)
logger.addHandler(consoleHandler)


def create_and_upload_binary():
    try:
        # required parameters:
        INPUT_FINITE_STATE_CLIENT_ID = os.environ.get("INPUT_FINITE_STATE_CLIENT_ID")
        INPUT_FINITE_STATE_SECRET = os.environ.get("INPUT_FINITE_STATE_SECRET")
        INPUT_FINITE_STATE_ORGANIZATION_CONTEXT = os.environ.get(
            "INPUT_FINITE_STATE_ORGANIZATION_CONTEXT"
        )
        INPUT_ASSET_ID = os.environ.get("INPUT_ASSET_ID")
        INPUT_VERSION = os.environ.get("INPUT_VERSION")
        INPUT_FILE_PATH = os.environ.get("INPUT_FILE_PATH")
        INPUT_QUICK_SCAN = os.environ.get("INPUT_QUICK_SCAN")

        # non required parameters:
        INPUT_BUSINESS_UNIT_ID = os.environ.get("INPUT_BUSINESS_UNIT_ID")
        INPUT_CREATED_BY_USER_ID = os.environ.get("INPUT_CREATED_BY_USER_ID")
        INPUT_PRODUCT_ID = os.environ.get("INPUT_PRODUCT_ID")
        INPUT_ARTIFACT_DESCRIPTION = os.environ.get("INPUT_ARTIFACT_DESCRIPTION")
        INPUT_AUTOMATIC_COMMENT = os.environ.get("INPUT_AUTOMATIC_COMMENT") == "true"
        INPUT_GITHUB_TOKEN = os.environ.get("INPUT_GITHUB_TOKEN")
    except KeyError:
        msg = f"Required inputs not available. Please, check required inputs definition"
        error = msg
        logger.error(msg)
        raise

    error = None
    asset_version = ""
    logger.info(f"Starting - Create new asset version and upload binary")

    if not INPUT_GITHUB_TOKEN and INPUT_AUTOMATIC_COMMENT:
        msg = f"Caught an exception. The [Github Token] input is required when [Automatic comment] is enabled."
        error = msg
        logger.error(msg)
        logger.debug(e)

    if error == None:
        # Authenticate
        try:
            logger.info(f"Starting - Authentication")
            token = finite_state_sdk.get_auth_token(
                INPUT_FINITE_STATE_CLIENT_ID, INPUT_FINITE_STATE_SECRET
            )
        except Exception as e:
            msg = (
                f"Caught an exception trying to get and auth token on Finite State: {e}"
            )
            error = msg
            logger.error(msg)
            logger.debug(e)

        # Create new asset version an upload the binary:
        if error == None:
            try:
                response = finite_state_sdk.create_new_asset_version_and_upload_binary(
                    token,
                    INPUT_FINITE_STATE_ORGANIZATION_CONTEXT,
                    business_unit_id=INPUT_BUSINESS_UNIT_ID,
                    created_by_user_id=INPUT_CREATED_BY_USER_ID,
                    asset_id=INPUT_ASSET_ID,
                    version=INPUT_VERSION,
                    file_path=INPUT_FILE_PATH,
                    product_id=INPUT_PRODUCT_ID,
                    artifact_description=INPUT_ARTIFACT_DESCRIPTION,
                    quick_scan=INPUT_QUICK_SCAN == "true",
                )
                asset_version = extract_asset_version(
                    response["launchBinaryUploadProcessing"]["key"]
                )
            except ValueError as e:
                msg = f"Caught a ValueError trying to create new asset version and upload binary: {e}"
                error = msg
                logger.error(msg)
                logger.debug(e)
            except TypeError as e:
                msg = f"Caught a TypeError trying to create new asset version and upload binary: {e}"
                error = msg
                logger.error(msg)
                logger.debug(e)
            except Exception as e:
                msg = f"Caught an exception trying to create new asset version and upload binary: {e}"
                error = msg
                logger.error(msg)
                logger.debug(e)

            if error == None:
                logger.info(f"File uploaded - Extracting asset version")
                set_multiline_output("response", json.dumps(response, indent=4))
                asset_version_url = "https://platform.finitestate.io/artifacts/{asset_id}/versions/{version}".format(
                    asset_id=INPUT_ASSET_ID, version=asset_version
                )
                set_output("asset-version-url", asset_version_url)
                logger.info(f"Asset version URL: {asset_version_url}")
                if not INPUT_AUTOMATIC_COMMENT:
                    logger.info(f"Automatic comment disabled")
                else:
                    if is_pull_request():
                        logger.info(f"Automatic comment enabled. Generating comment...")
                        generate_comment(INPUT_GITHUB_TOKEN, asset_version_url, logger)
                    else:
                        logger.info(
                            f"Automatic comment enabled. But this isn't a pull request. Skip generating comment..."
                        )
            else:
                set_multiline_output("error", error)
                logger.error(error)
        else:
            set_multiline_output("error", error)
            logger.error(error)
    else:
        set_multiline_output("error", error)
        logger.error(error)


if __name__ == "__main__":
    create_and_upload_binary()
