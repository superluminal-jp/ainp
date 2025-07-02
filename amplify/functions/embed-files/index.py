import json
import logging
import boto3
import os
import pickle
import tempfile
import PyPDF2
from docx import Document
import numpy as np
import faiss
from typing import List, Dict

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
s3_client = boto3.client("s3")
bedrock_client = boto3.client("bedrock-runtime")

# Environment variables
STORAGE_BUCKET_NAME = os.environ.get("STORAGE_BUCKET_NAME")
FAISS_INDEX_PREFIX = os.environ.get("FAISS_INDEX_PREFIX", "faiss-indexes")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

# Embedding model configuration
EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v1"
EMBEDDING_DIMENSION = 1536  # Titan embedding dimension


def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Get embeddings for a list of texts using Bedrock Titan model"""
    embeddings = []

    for text in texts:
        try:
            # Prepare the request body for Titan embedding model
            body = json.dumps({"inputText": text})

            # Invoke the model
            response = bedrock_client.invoke_model(
                modelId=EMBEDDING_MODEL_ID,
                body=body,
                contentType="application/json",
                accept="application/json",
            )

            # Parse the response
            response_body = json.loads(response["body"].read())
            embedding = response_body.get("embedding", [])
            embeddings.append(embedding)

        except Exception as e:
            logger.error(f"Error getting embedding for text: {str(e)}")
            # Return zero vector as fallback
            embeddings.append([0.0] * EMBEDDING_DIMENSION)

    return embeddings


def split_text(
    text: str, chunk_size: int = 1000, chunk_overlap: int = 200
) -> List[str]:
    """Simple text splitting function that respects word boundaries"""
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0

    while start < len(text):
        # Calculate end position
        end = start + chunk_size

        if end >= len(text):
            # Last chunk
            chunks.append(text[start:].strip())
            break

        # Try to find a good breaking point (word boundary)
        # Look backwards from the end position to find whitespace
        break_point = end
        for i in range(
            min(chunk_size // 4, end - start)
        ):  # Look back up to 1/4 of chunk size
            if text[end - i].isspace():
                break_point = end - i
                break

        chunks.append(text[start:break_point].strip())
        start = break_point - chunk_overlap

        # Ensure we don't go backwards
        if start < 0:
            start = break_point

    # Filter out empty chunks
    return [chunk for chunk in chunks if chunk.strip()]


def extract_text_from_file(
    file_content: bytes, file_name: str, content_type: str
) -> str:
    """Extract text content from various file types"""
    try:
        if content_type.startswith("text/") or file_name.endswith(
            (".txt", ".md", ".csv")
        ):
            return file_content.decode("utf-8")

        elif file_name.endswith(".pdf"):
            with tempfile.NamedTemporaryFile(suffix=".pdf") as tmp_file:
                tmp_file.write(file_content)
                tmp_file.flush()

                text = ""
                with open(tmp_file.name, "rb") as pdf_file:
                    pdf_reader = PyPDF2.PdfReader(pdf_file)
                    for page in pdf_reader.pages:
                        text += page.extract_text() + "\n"
                return text

        elif file_name.endswith((".docx", ".doc")):
            with tempfile.NamedTemporaryFile(suffix=".docx") as tmp_file:
                tmp_file.write(file_content)
                tmp_file.flush()

                doc = Document(tmp_file.name)
                text = ""
                for paragraph in doc.paragraphs:
                    text += paragraph.text + "\n"
                return text

        elif file_name.endswith(".json"):
            json_data = json.loads(file_content.decode("utf-8"))
            return json.dumps(json_data, indent=2)

        else:
            # Try to decode as text for unknown types
            return file_content.decode("utf-8", errors="ignore")

    except Exception as e:
        logger.error(f"Error extracting text from {file_name}: {str(e)}")
        return ""


def load_or_create_faiss_index(database_id: str):
    """Load existing FAISS index from S3 or create a new one"""
    index_key = f"{FAISS_INDEX_PREFIX}/{database_id}/index.faiss"
    metadata_key = f"{FAISS_INDEX_PREFIX}/{database_id}/metadata.pkl"

    try:
        # Try to load existing index from S3
        logger.info(
            f"Attempting to load existing FAISS index for database: {database_id}"
        )

        # Download FAISS index file
        with tempfile.NamedTemporaryFile() as index_file:
            s3_client.download_file(STORAGE_BUCKET_NAME, index_key, index_file.name)

            # Load FAISS index
            index = faiss.read_index(index_file.name)

            # Download metadata
            with tempfile.NamedTemporaryFile() as metadata_file:
                s3_client.download_file(
                    STORAGE_BUCKET_NAME, metadata_key, metadata_file.name
                )

                with open(metadata_file.name, "rb") as f:
                    metadata = pickle.load(f)

                logger.info(
                    f"Successfully loaded existing FAISS index with {index.ntotal} vectors"
                )
                return index, metadata

    except Exception as e:
        logger.info(f"Could not load existing index ({str(e)}), creating new one")

        # Create new FAISS index
        index = faiss.IndexFlatL2(EMBEDDING_DIMENSION)
        metadata = []

        logger.info("Created new FAISS index")
        return index, metadata


def save_faiss_index(index: faiss.Index, metadata: List[Dict], database_id: str):
    """Save FAISS index and metadata to S3"""
    index_key = f"{FAISS_INDEX_PREFIX}/{database_id}/index.faiss"
    metadata_key = f"{FAISS_INDEX_PREFIX}/{database_id}/metadata.pkl"

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            # Save FAISS index
            index_path = os.path.join(temp_dir, "index.faiss")
            faiss.write_index(index, index_path)

            # Upload FAISS index to S3
            s3_client.upload_file(index_path, STORAGE_BUCKET_NAME, index_key)

            # Save metadata
            metadata_path = os.path.join(temp_dir, "metadata.pkl")
            with open(metadata_path, "wb") as f:
                pickle.dump(metadata, f)

            s3_client.upload_file(metadata_path, STORAGE_BUCKET_NAME, metadata_key)

        logger.info(f"Successfully saved FAISS index for database: {database_id}")

    except Exception as e:
        logger.error(f"Error saving FAISS index: {str(e)}")
        raise


def handler(event, context):
    """
    Lambda handler for embedding files into vector database

    Expected event structure:
    {
        "arguments": {
            "fileKey": "databases/shared/filename.txt",
            "fileName": "filename.txt",
            "databaseId": "database-id",
            "databaseFileId": "database-file-id"
        }
    }
    """

    try:
        logger.info(f"[EmbedFiles] Received event: {json.dumps(event, default=str)}")

        # Extract arguments
        arguments = event.get("arguments", {})
        file_key = arguments.get("fileKey")
        file_name = arguments.get("fileName")
        database_id = arguments.get("databaseId")
        database_file_id = arguments.get("databaseFileId")

        # Get bucket name from environment variable
        bucket_name = STORAGE_BUCKET_NAME

        if not all([file_key, file_name, database_id, database_file_id]):
            raise ValueError(
                "Missing required arguments: fileKey, fileName, databaseId, databaseFileId"
            )

        if not bucket_name:
            raise ValueError("STORAGE_BUCKET_NAME environment variable not set")

        logger.info(
            f"[EmbedFiles] Processing file: {file_name} from bucket: {bucket_name}"
        )

        # Download file from S3
        try:
            response = s3_client.get_object(Bucket=bucket_name, Key=file_key)
            file_content = response["Body"].read()
            content_type = response.get("ContentType", "application/octet-stream")
            logger.info(
                f"[EmbedFiles] Downloaded file: {len(file_content)} bytes, type: {content_type}"
            )
        except Exception as e:
            logger.error(f"[EmbedFiles] Error downloading file from S3: {str(e)}")
            raise

        # Extract text content
        text_content = extract_text_from_file(file_content, file_name, content_type)
        if not text_content or len(text_content.strip()) == 0:
            logger.warning(f"[EmbedFiles] No text content extracted from {file_name}")
            return {
                "success": False,
                "message": "No text content found in file",
                "chunksProcessed": 0,
            }

        logger.info(f"[EmbedFiles] Extracted text: {len(text_content)} characters")

        # Split text into chunks
        chunks = split_text(text_content, chunk_size=1000, chunk_overlap=200)
        logger.info(f"[EmbedFiles] Split into {len(chunks)} chunks")

        # Load or create FAISS index for this database
        index, existing_metadata = load_or_create_faiss_index(database_id)

        # Get embeddings for all chunks
        logger.info(f"[EmbedFiles] Getting embeddings for {len(chunks)} chunks")
        embeddings = get_embeddings(chunks)

        # Create metadata for each chunk
        chunk_metadata = []
        for i, chunk in enumerate(chunks):
            metadata = {
                "file_name": file_name,
                "file_key": file_key,
                "file_type": content_type,
                "database_id": database_id,
                "database_file_id": database_file_id,
                "chunk_index": i,
                "chunk_text": chunk,
                "created_at": context.aws_request_id,
            }
            chunk_metadata.append(metadata)

        # Add embeddings to FAISS index
        try:
            # Convert embeddings to numpy array
            embeddings_array = np.array(embeddings, dtype=np.float32)

            # Add to index
            index.add(embeddings_array)

            # Update metadata list
            existing_metadata.extend(chunk_metadata)

            # Save updated index back to S3
            save_faiss_index(index, existing_metadata, database_id)

            processed_chunks = len(chunks)
            logger.info(
                f"[EmbedFiles] Successfully added {processed_chunks} chunks to FAISS index"
            )

        except Exception as e:
            logger.error(f"[EmbedFiles] Error adding embeddings to FAISS: {str(e)}")
            raise

        logger.info(
            f"[EmbedFiles] Successfully processed {processed_chunks}/{len(chunks)} chunks"
        )

        return {
            "success": True,
            "message": f"Successfully embedded {processed_chunks} chunks from {file_name}",
            "chunksProcessed": processed_chunks,
            "totalChunks": len(chunks),
            "fileKey": file_key,
            "databaseId": database_id,
            "databaseFileId": database_file_id,
        }

    except Exception as e:
        logger.error(f"[EmbedFiles] Error in embed function: {str(e)}")
        raise Exception(f"Embed function error: {str(e)}")
