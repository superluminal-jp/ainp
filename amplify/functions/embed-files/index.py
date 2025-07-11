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

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client("s3")
bedrock_client = boto3.client("bedrock-runtime")

STORAGE_BUCKET_NAME = os.environ.get("STORAGE_BUCKET_NAME")
FAISS_INDEX_PREFIX = os.environ.get("FAISS_INDEX_PREFIX", "faiss-indexes")
EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v1"
EMBEDDING_DIMENSION = 1536


def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Get embeddings using Bedrock Titan model."""
    embeddings = []
    for text in texts:
        try:
            body = json.dumps({"inputText": text})
            response = bedrock_client.invoke_model(
                modelId=EMBEDDING_MODEL_ID,
                body=body,
                contentType="application/json",
                accept="application/json",
            )
            response_body = json.loads(response["body"].read())
            embeddings.append(response_body.get("embedding", []))
        except Exception:
            embeddings.append([0.0] * EMBEDDING_DIMENSION)
    return embeddings


def split_text(
    text: str, chunk_size: int = 1000, chunk_overlap: int = 200
) -> List[str]:
    """Split text into chunks respecting word boundaries."""
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size

        if end >= len(text):
            chunks.append(text[start:].strip())
            break

        # Find word boundary
        break_point = end
        for i in range(min(chunk_size // 4, end - start)):
            if text[end - i].isspace():
                break_point = end - i
                break

        chunks.append(text[start:break_point].strip())
        start = max(break_point - chunk_overlap, break_point)

    return [chunk for chunk in chunks if chunk.strip()]


def extract_text_from_file(
    file_content: bytes, file_name: str, content_type: str
) -> str:
    """Extract text content from various file types."""
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
                return "\n".join(paragraph.text for paragraph in doc.paragraphs)

        elif file_name.endswith(".json"):
            json_data = json.loads(file_content.decode("utf-8"))
            return json.dumps(json_data, indent=2)

        else:
            return file_content.decode("utf-8", errors="ignore")

    except Exception:
        return ""


def load_or_create_faiss_index(database_id: str):
    """Load existing FAISS index from S3 or create new one."""
    index_key = f"{FAISS_INDEX_PREFIX}/{database_id}/index.faiss"
    metadata_key = f"{FAISS_INDEX_PREFIX}/{database_id}/metadata.pkl"

    try:
        with tempfile.NamedTemporaryFile() as index_file:
            s3_client.download_file(STORAGE_BUCKET_NAME, index_key, index_file.name)
            index = faiss.read_index(index_file.name)

            with tempfile.NamedTemporaryFile() as metadata_file:
                s3_client.download_file(
                    STORAGE_BUCKET_NAME, metadata_key, metadata_file.name
                )
                with open(metadata_file.name, "rb") as f:
                    metadata = pickle.load(f)

                return index, metadata
    except Exception:
        return faiss.IndexFlatL2(EMBEDDING_DIMENSION), []


def save_faiss_index(index: faiss.Index, metadata: List[Dict], database_id: str):
    """Save FAISS index and metadata to S3."""
    index_key = f"{FAISS_INDEX_PREFIX}/{database_id}/index.faiss"
    metadata_key = f"{FAISS_INDEX_PREFIX}/{database_id}/metadata.pkl"

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            # Save FAISS index
            index_path = os.path.join(temp_dir, "index.faiss")
            faiss.write_index(index, index_path)
            s3_client.upload_file(index_path, STORAGE_BUCKET_NAME, index_key)

            # Save metadata
            metadata_path = os.path.join(temp_dir, "metadata.pkl")
            with open(metadata_path, "wb") as f:
                pickle.dump(metadata, f)
            s3_client.upload_file(metadata_path, STORAGE_BUCKET_NAME, metadata_key)
    except Exception as e:
        logger.error(f"Error saving FAISS index: {str(e)}")
        raise


def handler(event, context):
    """Lambda handler for embedding files into vector database."""
    try:
        arguments = event.get("arguments", {})
        file_key = arguments.get("fileKey")
        file_name = arguments.get("fileName")
        database_id = arguments.get("databaseId")
        database_file_id = arguments.get("databaseFileId")

        if not all(
            [file_key, file_name, database_id, database_file_id, STORAGE_BUCKET_NAME]
        ):
            raise ValueError("Missing required arguments or environment variables")

        # Download file from S3
        try:
            response = s3_client.get_object(Bucket=STORAGE_BUCKET_NAME, Key=file_key)
            file_content = response["Body"].read()
            content_type = response.get("ContentType", "application/octet-stream")
        except Exception as e:
            logger.error(f"Error downloading file from S3: {str(e)}")
            raise

        # Extract text content
        text_content = extract_text_from_file(file_content, file_name, content_type)
        if not text_content or len(text_content.strip()) == 0:
            return {
                "success": False,
                "message": "No text content found in file",
                "chunksProcessed": 0,
            }

        # Split text into chunks
        chunks = split_text(text_content, chunk_size=1000, chunk_overlap=200)

        # Load or create FAISS index
        index, existing_metadata = load_or_create_faiss_index(database_id)

        # Get embeddings for all chunks
        embeddings = get_embeddings(chunks)

        # Create metadata for each chunk
        chunk_metadata = []
        for i, chunk in enumerate(chunks):
            chunk_metadata.append(
                {
                    "file_name": file_name,
                    "file_key": file_key,
                    "file_type": content_type,
                    "database_id": database_id,
                    "database_file_id": database_file_id,
                    "chunk_index": i,
                    "chunk_text": chunk,
                    "created_at": context.aws_request_id,
                }
            )

        # Add embeddings to FAISS index
        try:
            embeddings_array = np.array(embeddings, dtype=np.float32)
            index.add(embeddings_array)
            existing_metadata.extend(chunk_metadata)
            save_faiss_index(index, existing_metadata, database_id)
            processed_chunks = len(chunks)
        except Exception as e:
            logger.error(f"Error adding embeddings to FAISS: {str(e)}")
            raise

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
        logger.error(f"Error in embed function: {str(e)}")
        raise Exception(f"Embed function error: {str(e)}")
