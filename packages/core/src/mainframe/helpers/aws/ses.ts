import {
    SESClient,
    SendTemplatedEmailCommand,
    SendBulkTemplatedEmailCommand,
    CreateTemplateCommand,
    DeleteTemplateCommand,
    GetTemplateCommand,
    GetTemplateCommandOutput,
    SendRawEmailCommand,
    SendRawEmailCommandOutput,
} from "@aws-sdk/client-ses";
import { stringToUint8Array } from "../utils";

// @TODO Needs to be replaced by sendTemplatedEmail
export const sendDefaultTemplatedEmail = async (
    fromName: string,
    receivers: any = [],
    templateName: string,
    templateData: any = {},
) => {
    const sesClient = new SESClient({ region: process.env.SERVICE_REGION });

    return await sesClient.send(
        new SendTemplatedEmailCommand({
            Source: `${fromName} <noreply@${process.env.DOMAIN}>`,
            Destination: {
                ToAddresses: receivers,
            },
            ReplyToAddresses: [`noreply@${process.env.DOMAIN}`],
            Template: templateName,
            TemplateData: JSON.stringify(templateData),
        }),
    );
};

export const createEmailTemplate = async (
    templateName: string,
    subject: string,
    htmlCode: string = "",
    text: string = "",
) => {
    const sesClient = new SESClient({ region: process.env.SERVICE_REGION });

    return await sesClient.send(
        new CreateTemplateCommand({
            Template: {
                TemplateName: templateName,
                SubjectPart: subject,
                TextPart: text,
                HtmlPart: htmlCode,
            },
        }),
    );
};

export const deleteEmailTemplate = async (templateName: string) => {
    const sesClient = new SESClient({ region: process.env.SERVICE_REGION });

    return await sesClient.send(
        new DeleteTemplateCommand({
            TemplateName: templateName,
        }),
    );
};

export const getEmailTemplate = async (templateName: string): Promise<GetTemplateCommandOutput | null> => {
    const sesClient = new SESClient({ region: process.env.SERVICE_REGION });

    try {
        return await sesClient.send(
            new GetTemplateCommand({
                TemplateName: templateName,
            }),
        );
    } catch (e) {
        console.log("HELPER -> SES GET EMAIL TEMPLATE ERROR", e);
        return null;
    }
};

export const sendTemplatedEmail = async (
    fromName: string,
    receivers: string[] = [],
    templateName: string,
    templateData: any = {},
) => {
    const sesClient = new SESClient({ region: process.env.SERVICE_REGION });

    return await sesClient.send(
        new SendTemplatedEmailCommand({
            Source: `${fromName} <noreply@${process.env.DOMAIN}>`,
            Destination: {
                ToAddresses: receivers,
            },
            ReplyToAddresses: [`noreply@${process.env.DOMAIN}`],
            Template: templateName,
            TemplateData: JSON.stringify(templateData),
        }),
    );
};

export const sendBulkTemplatedEmail = async (
    fromName: string,
    receivers: any[] = [],
    templateName: string,
    defaultTemplateData: any = {},
    tags: { Name: string; Value: string }[] = [],
) => {
    const sesClient = new SESClient({ region: process.env.SERVICE_REGION });

    return await sesClient.send(
        new SendBulkTemplatedEmailCommand({
            Source: `${fromName} <noreply@${process.env.DOMAIN}>`,
            ReplyToAddresses: [`noreply@${process.env.DOMAIN}`],
            Template: templateName,
            DefaultTemplateData: JSON.stringify(defaultTemplateData),
            Destinations: receivers.map((receiver) => {
                return {
                    Destination: {
                        ToAddresses: [receiver.email],
                    },
                    ReplacementTemplateData: JSON.stringify(receiver.templateData),
                    ReplacementTags: [
                        {
                            Name: "sesTemplateName",
                            Value: templateName,
                        },
                        ...tags,
                        ...(receiver.tags || []),
                    ],
                };
            }),
        }),
    );
};

interface ISendRawEmail {
    rawMessage: string;
    tags?: { Name: string; Value: string }[];
}
export const sendRawEmail = async ({
    rawMessage = "",
    tags = []
    }: ISendRawEmail): Promise<SendRawEmailCommandOutput> => {
    const sesClient = new SESClient({ region: process.env.SERVICE_REGION });

    return await sesClient.send(
        new SendRawEmailCommand({
            RawMessage: {
                Data: stringToUint8Array(rawMessage),
            },
            Tags: tags
        }),
    );
};
