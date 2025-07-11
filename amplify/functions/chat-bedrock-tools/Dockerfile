# Build stage
FROM --platform=linux/amd64 python:3.12-slim as builder

# Install dependencies
COPY requirements.txt /tmp/
RUN python3 -m pip install -r /tmp/requirements.txt --target /tmp/packages --no-cache-dir

# Final stage
FROM --platform=linux/amd64 public.ecr.aws/lambda/python:3.12

# Copy installed packages from builder stage
COPY --from=builder /tmp/packages ${LAMBDA_TASK_ROOT}

# Copy function code
COPY index.py ${LAMBDA_TASK_ROOT}

# Set the CMD to your handler
CMD ["index.handler"] 