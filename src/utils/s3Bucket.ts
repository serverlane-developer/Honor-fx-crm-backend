import {
  S3Client,
  PutObjectCommand,
  PutObjectRequest,
  PutObjectOutput,
  GetObjectRequest,
  GetObjectCommand,
  GetObjectOutput,
  DeleteObjectRequest,
  DeleteObjectCommand,
  DeleteObjectOutput,
} from "@aws-sdk/client-s3";
import config from "../config";
import { requestId } from "../@types/Common";
import logger from "./logger";

const { BUCKET_NAME } = config;

const BUCKET_FOLDERS = {};

const foldersList = Object.values(BUCKET_FOLDERS);

type parentFolder = keyof typeof BUCKET_FOLDERS;

const uploadFile = async (
  file: File,
  key: string,
  fileType: string,
  parentFolder: parentFolder,
  requestId: requestId
) => {
  try {
    if (!file || !key || !fileType) throw "Required paramter not found";
    if (!foldersList.includes(parentFolder)) throw `Folder: ${parentFolder} is not handled`;

    const path = `${parentFolder}/${key}`;

    const client = new S3Client({});
    const params: PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: path,
      Body: file,
      ContentType: fileType,
    };
    const command = new PutObjectCommand(params);
    const response: PutObjectOutput = await client.send(command);
    return response;
  } catch (err) {
    logger.error("Error uploading file to s3 bucket", { err, requestId, key, parentFolder, fileType });
    throw err;
  }
};

const getFile = async (key: string, parentFolder: parentFolder, requestId: requestId) => {
  try {
    const path = `${parentFolder}/${key}`;

    const client = new S3Client({});
    const params: GetObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: path,
    };
    const command = new GetObjectCommand(params);
    const response: GetObjectOutput = await client.send(command);
    return response;
  } catch (error) {
    logger.error(`Error getting file for key: ${key}`, { error, requestId, key, parentFolder });
    throw error;
  }
};

const deleteFile = async (key: string, parentFolder: parentFolder, requestId: requestId) => {
  try {
    const path = `${parentFolder}/${key}`;

    const client = new S3Client({});
    const params: DeleteObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: path,
    };
    const command = new DeleteObjectCommand(params);
    const response: DeleteObjectOutput = await client.send(command);
    return response;
  } catch (error) {
    logger.error(`Error deleting with key: ${key}`, { error, requestId, key, parentFolder });
    throw error;
  }
};

const s3Bucket = { uploadFile, getFile, deleteFile };

export { s3Bucket };
