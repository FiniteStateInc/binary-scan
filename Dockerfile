# Container image that runs your code
FROM python:3.9-alpine

WORKDIR /usr/src/app
COPY . /usr/src/app/
RUN pip install --no-cache-dir -r requirements.txt
ENTRYPOINT [ "python3","/usr/src/app/upload_binary.py"]

