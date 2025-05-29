import { MediaConvertClient, CreateJobCommand } from "@aws-sdk/client-mediaconvert"; // ES Modules import

export const createJob = async (
    fileInputs: string[] = [],
    outputDirectory: string,
    roleArn: string,
    metaData: any = undefined,
) => {
    const client = new MediaConvertClient({ region: process.env.SERVICE_REGION });

    if (!fileInputs.length) return;

    const inputs: any = fileInputs.map((fileInput) => {
        return {
            FileInput: `s3://${fileInput}`,
            AudioSelectors: {
                "Audio Selector 1": {
                    Offset: 0,
                    DefaultSelection: "DEFAULT",
                    ProgramSelection: 1,
                },
            },
        };
    });

    const command = new CreateJobCommand({
        UserMetadata: metaData || {},
        Role: roleArn,
        Settings: {
            Inputs: inputs,
            OutputGroups: [
                {
                    CustomName: "IVP-Job-Output",
                    OutputGroupSettings: {
                        Type: "FILE_GROUP_SETTINGS",
                        FileGroupSettings: {
                            Destination: `s3://${outputDirectory}`,
                        },
                    },
                    Outputs: [
                        {
                            OutputSettings: {},
                            VideoDescription: {
                                CodecSettings: {
                                    Codec: "H_264",
                                    H264Settings: {
                                        Bitrate: 5000000,
                                    },
                                },
                            },
                            ContainerSettings: {
                                Container: "MP4",
                            },
                            AudioDescriptions: [
                                {
                                    AudioTypeControl: "FOLLOW_INPUT",
                                    CodecSettings: {
                                        Codec: "AAC",
                                        AacSettings: {
                                            Bitrate: 96000,
                                            CodecProfile: "LC",
                                            CodingMode: "CODING_MODE_2_0",
                                            RateControlMode: "CBR",
                                            RawFormat: "NONE",
                                            SampleRate: 48000,
                                            Specification: "MPEG4",
                                            AudioDescriptionBroadcasterMix: "NORMAL",
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    });
    return await client.send(command);
};
