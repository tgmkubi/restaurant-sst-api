import {
    S3Client,
    GetObjectCommand,
    ListObjectsV2Command,
    ListObjectVersionsCommand,
    DeleteObjectsCommand,
    DeleteBucketCommand,
    HeadObjectCommand,
    HeadObjectCommandInput,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3Client = new S3Client();

export const getObject = async (bucket: string | undefined, key: string, region = "us-east-1") => {
    const clientS3 = new S3Client({ region: region });
    console.log(bucket);
    console.log(key);
    console.log(region);
    try {
        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });

        return await clientS3.send(command);
    } catch (e: any) {
        if (["NoSuchKey", "AccessDenied"].includes(e.Code)) return null;
        console.log("getObject ERROR!", e);
        throw e;
    }
};

export const createPresignedUrlGet = async (
    bucket: string | undefined,
    key: string,
    expiration = 3600,
    region: string,
    adds: any = {},
) => {
    const clientS3 = new S3Client({ region: region || "us-east-1" });

    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ...adds,
    });
    return await getSignedUrl(clientS3, command, { expiresIn: expiration });
};

export const createPresignedUrlPut = async (
    bucket: string | undefined,
    key: string,
    expiration = 3600,
    region: string,
) => {
    const clientS3 = new S3Client({ region: region || "us-east-1" });

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
    });
    return await getSignedUrl(clientS3, command, { expiresIn: expiration });
};

export const listObjects = async (
    bucketName: string | undefined,
    prefix: string | undefined = undefined,
    region = "us-east-1",
) => {
    const clientS3 = new S3Client({ region: region });

    return await clientS3.send(
        new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix || undefined,
        }),
    );
};

export const listObjectVersions = async (bucketName: string) => {
    return await s3Client.send(
        new ListObjectVersionsCommand({
            Bucket: bucketName,
        }),
    );
};

export const deleteObjects = async (bucketName: string, objects: any) => {
    return await s3Client.send(
        new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: {
                Objects: objects,
            },
        }),
    );
};

export const deleteBucket = async (bucketName: string) => {
    return await s3Client.send(
        new DeleteBucketCommand({
            Bucket: bucketName,
        }),
    );
};

export const deleteObject = async (bucket: string | undefined, key: string, region: any = null) => {
    if (region) s3Client = new S3Client({ region: region });

    return await s3Client.send(
        new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
        }),
    );
};

export const createObject = async (
    bucket: string | undefined,
    key: string,
    body: any,
    region: string | null = null,
) => {
    if (region) s3Client = new S3Client({ region: region });

    return await s3Client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body.toString(),
        }),
    );
};

export const headBucket = async (bucket: string | undefined, region = null) => {
    if (region) s3Client = new S3Client({ region: region });

    try {
        return await s3Client.send(
            new HeadBucketCommand({
                Bucket: bucket,
            }),
        );
    } catch (e: any) {
        console.log("headBucket ERROR!", e.name);
        return null;
    }
};

export const headObject = async ({ Bucket, Key }: HeadObjectCommandInput, region: string | undefined = undefined) => {
    s3Client = new S3Client({ region: region || "us-east-1" });

    try {
        return await s3Client.send(new HeadObjectCommand({ Bucket, Key }));
    } catch (e: any) {
        console.log("headObject ERROR!", e.name);
        if (e.name === "NotFound") return null;
        throw e;
    }
};
