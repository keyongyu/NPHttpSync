import {Credential, Logger, NetProgressNativeArg, NetProgressReportFunc} from "./Common";
import {gStorageConfig} from "./Storage"
import {gHttpAsync} from "./HttpAsync"
import * as Crypto from "./CryptoJSTSBridge"

export class gS3 {
    static getAmzDate(dateStr: string) {
        const chars = [':', '-'];
        for (let i = 0; i < chars.length; i++) {
            while (dateStr.indexOf(chars[i]) !== -1) {
                dateStr = dateStr.replace(chars[i], '');
            }
        }
        dateStr = dateStr.split('.')[0] + 'Z';
        return dateStr;
    };

    static getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string) {
        const dateKey = Crypto.HmacSHA256(dateStamp, 'AWS4' + key);
        const regionKey = Crypto.HmacSHA256(regionName, dateKey);
        const serviceKey = Crypto.HmacSHA256(serviceName, regionKey);
        const signKey = Crypto.HmacSHA256('aws4_request', serviceKey);
        return signKey;
    };
    static uriEncode(str:string){
       let hex= '0123456789ABCDEF';
       let ret = '';
       for( let i=0; i<str.length; i++ ) {
            let c = str.charCodeAt(i);
           // 'A'-'Z', 'a'-'z', '/', '0'-'9', '-', '.', '_', and '~'.
            if( (c >= 47/* / 0*/ && c <= 57/*9*/) ||
                (c >= 65/*A*/ && c <= 90/*Z*/) ||
                (c >= 97/*a*/ && c <= 122/*z*/) ||
                c == 45/*-*/ || c == 46/*.*/ || c == 95/*_*/ ||  c == 126/*~*/) {
                ret += str[i];
            }
            else {
                ret += '%';
                ret += hex[ (c & 0xF0) >> 4 ];
                ret += hex[ (c & 0x0F) ];
            }
        }
        return ret;
    }

    static AuthorizationHeader(http_method: "GET" | "PUT" | "POST", path: string, credential: Credential) {
        const amzDate = gS3.getAmzDate(new Date().toISOString());
        const authDate = amzDate.split('T')[0];
        const hashedPayload = 'UNSIGNED-PAYLOAD';

        const url = `${credential.bucket}.${credential.host}`;
        const region = credential.region;
        const access_key_id = credential.access_key_id;
        const secret_access_key = credential.secret_access_key||"";
        const service = 's3';

        const canonicalReq = http_method + '\n' +
            gS3.uriEncode(path) + '\n' +
            '\n' +
            'host:' + url + '\n' +
            'x-amz-content-sha256:' + hashedPayload + '\n' +
            'x-amz-date:' + amzDate + '\n' +
            '\n' +
            'host;x-amz-content-sha256;x-amz-date' + '\n' +
            hashedPayload;

        const canonicalReqHash = Crypto.SHA256(canonicalReq);
        const stringToSign = 'AWS4-HMAC-SHA256\n' +
            amzDate + '\n' +
            authDate + '/' + region + '/' + service + '/aws4_request\n' +
            canonicalReqHash;
        const signingKey = gS3.getSignatureKey(secret_access_key, authDate, region, service);
        const authKey = Crypto.HmacSHA256(stringToSign, signingKey);
        const authString = 'AWS4-HMAC-SHA256 ' +
            'Credential=' +
            access_key_id + '/' +
            authDate + '/' +
            region + '/' +
            service + '/aws4_request,' +
            'SignedHeaders=host;x-amz-content-sha256;x-amz-date,' +
            'Signature=' + authKey;
        return 'Authorization:' + authString + '\nx-amz-date:' + amzDate + '\nx-amz-content-sha256:' + hashedPayload;
    }

    static async DownloadFile (path:string, progress:NetProgressReportFunc, remark = {}) {
        if (!path.startsWith('/')) {
            path = '/' + path;
        }

        const credential = gStorageConfig.GetStorageInfo('CREDENTIALS') as Credential;
        if(!credential) {
            Logger.Warn("No credential for S3 file download");
            return null;
        }
        const http_method = 'GET';
        const url = `https://${credential.bucket}.${credential.host}${path}`;

        const header = gS3.AuthorizationHeader(http_method, path, credential);
        return await gHttpAsync.DownloadFileAsync(url, http_method, header, '',
            (progressArg: NetProgressNativeArg) => {
                if (progressArg.done !== undefined && progressArg.total !== undefined) {
                    progress({current: progressArg.done, total: progressArg.total});
                }
            }, remark);
    }

    static async UploadFile(filePath:string, serverFilePath:string, progress:NetProgressReportFunc, silentCallback = false) {
        if (!serverFilePath.startsWith('/')) {
            serverFilePath = '/' + serverFilePath;
        }
        const credential = gStorageConfig.GetStorageInfo('CREDENTIALS') as Credential;
        const http_method = 'PUT';
        const url = `https://${credential.bucket}.${credential.host}${serverFilePath}`;

        let header = gS3.AuthorizationHeader(http_method, serverFilePath, credential);
        header += '\nContent-Type: application/octet-stream';
        return await gHttpAsync.UploadFileAsync(url, header, http_method, filePath, (arg: NetProgressNativeArg) => {
            if (arg.done !== undefined && arg.total !== undefined) {
                if (!silentCallback) {
                    let progressObj = {
                        status: arg.total === arg.done ? 'completed' : 'progress',
                        detail: filePath, current: arg.done, total: arg.total
                    };
                    progress(progressObj);
                } else {
                    Logger.Data(`Uploading File ${filePath}: ${arg.done}/${arg.total}`);
                }
            }
        });
    }
  }