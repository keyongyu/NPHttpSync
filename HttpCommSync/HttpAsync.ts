import {DataInToken, Logger, NetProgressReportNativeFunc} from './Common';
import NPSyncSpec, {HttpMethod, IHttpResponse} from '../specs/NativeNPSync';
import {gAuth} from './OAuth';
//import RNFS from 'react-native-fs';
import {GetHttpTmpFolder} from './HttpDataSync.ts';
export const NoNetwork = 92;
export const ConnectionError = 91;
export function isTimeoutResponse(rsp:IHttpResponse):boolean
{
   //{"req_id":"15","type":"RESULT_ERR","error_code":91,"error_desc":"Code(-1001): Time out"}
  if(rsp.error_code === ConnectionError && rsp.error_desc)
      {return rsp.error_desc.indexOf('-1001') >= 0;}
  return false;
}
export var gHttpAsync = new class{
    HttpReqID:number;
    constructor(){
        this.HttpReqID = 1;
    }
    private HttpHeader(token: string) {
        return 'Accept:application/json;\nContent-Type:application/json; charset=utf-8\nAuthorization:Bearer ' + token;
    }
    async SendWebReqWithTokenAsync(url:string, method:HttpMethod, dataInToken:DataInToken,
                          content:string/*|Uint8Array*/, progress_reporter?:NetProgressReportNativeFunc, timeoutInSec = -1):Promise<IHttpResponse> {
        /*if(this.HttpReqID%3==2) {
            Logger.Error("Refreshing Access token");
            dataInToken.AcessToken = await gAuth.RegenerateAccessTokenAsync() ?? dataInToken.AcessToken;
            Logger.Error("Refreshing Access token is done");
        }*/
        await gAuth.UpdateAccessTokenIfGettingExpiredAsync(dataInToken);
        let reply = await this.SendWebReqAsync(url,method, this.HttpHeader(dataInToken.AcessToken), content, progress_reporter, timeoutInSec);
        if(reply && reply.rsp_data && (reply.rsp_code === 403 || reply.rsp_code === 401)){
             //dataInToken.AcessToken = await gAuth.RegenerateAccessTokenAsync()??dataInToken.AcessToken;
             await gAuth.UpdateAccessTokenIfGettingExpiredAsync(dataInToken, true);
             reply = await this.SendWebReqAsync(url,method, this.HttpHeader(dataInToken.AcessToken), content, progress_reporter, timeoutInSec );
        }
        return reply;
    }
    async SendWebReqAsync(url:string, method:HttpMethod, header:string,
                          content:string/*|Uint8Array*/, progress_reporter?:NetProgressReportNativeFunc, timeoutInSec = -1):Promise<IHttpResponse> {
        return new Promise<IHttpResponse>((resolve) => {
            const new_header = header.replace(/Authorization:Bearer .*/, 'Authorization:Bearer ****');
            if (typeof content === 'string')
                {Logger.Data('SendWebReqAsync url: ' + url + '\nHEADER: ' + new_header + '\nBODY: ' + content);}
            else {
                Logger.Data('SendWebReqAsync url: ' + url + '\nHEADER: ' + new_header);
                Logger.Data(content);
            }
            //return {type:RESULT_ERR, error_code, error_desc} if something wrong
            NPSyncSpec.SendHttpRequest(
                result => {
                    if (/*result.type == "RECEIVING" || */result.type === 'SENDING') {
                        if (progress_reporter)
                            {progress_reporter({total:result.total ?? 1,done:result.done ?? 1});}
                        return;
                    } else if (result.type === 'RESULT_RSP') {
                        Logger.Data('Got reply for url: ' + url + '\nRsp: ' + JSON.stringify(result));
                        resolve(result);
                    } else if (result.type === 'RESULT_ERR') {
                        Logger.Error('Bad reply for url: ' + url + '\nErr: ' + JSON.stringify(result));
                        //if(!IsDevEngine())
                        //    //System error. Please try again. If error persists, please contact Administrator.
                        //    alert('(2709)');
                        resolve(result);
                    }
                },
                (this.HttpReqID++).toString(), method, url, header, content, '', timeoutInSec);
            //if(ret) {
            //    Logger.Error('Bad reply for url: ' + url + '\nErr: ' + JSON.stringify(ret));
            //    resolve(ret);
            //}
        });

    }

    // private HandleNoNetwork(ret:IHttpResponse, url: string, resolve: (value: IHttpResponse) => void) {
    //     if (ret && ret.type == "RESULT_ERR"){
    //         Logger.Error('Bad reply for url: ' + url + '\nErr: ' + JSON.stringify(ret));
    //         if(ret.error_code === NoNetwork) {
    //             //should not raise a msgbox
    //             //if (!IsDevEngine()) {
    //             //    //No network available, please ensure that network connection is available and then try again
    //             //    alert('(2710)');
    //             //}
    //         }
    //         resolve(ret);
    //     }
    // }

    private makeMultipartHttpHeader (boundary:string, token:string) {
      return 'Content-Type: multipart/form-data; boundary=--------------------------' + boundary
             + '\nAuthorization:Bearer ' + token;
    }

    private GenerateBoundary () {
        let d = new Date().getTime();
        /*if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            d += performance.now(); //use high-precision timer if available
        }*/
        return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    // async UploadMultipartFileWithTokenAsync(url: string, method: HttpMethod, contentFile: string,
    //                 progress_reporter: NetProgressReportNativeFunc, dataInToken: DataInToken): Promise<IHttpResponse> {
    //     await gAuth.UpdateAccessTokenIfGettingExpiredAsync(dataInToken);
    //     let reply= await this.UploadMultipartFileAsync(url, method, contentFile,  progress_reporter, dataInToken.AcessToken );
    //     if(reply && reply.rsp_data && reply.rsp_code === 403){
    //         //dataInToken.AcessToken = await gAuth.RegenerateAccessTokenAsync()??dataInToken.AcessToken;
    //         await gAuth.UpdateAccessTokenIfGettingExpiredAsync(dataInToken, true);
    //         return await this.UploadMultipartFileAsync(url, method, contentFile,  progress_reporter, dataInToken.AcessToken );
    //     }
    //     return reply;
    //
    //
    // }
    // private async UploadMultipartFileAsync(url: string, method: HttpMethod, contentFile: string,
    //     progress_reporter: NetProgressReportNativeFunc, bearer: string): Promise<IHttpResponse> {
    //     let boundary = this.GenerateBoundary();
    //     let tempPath = __GetHttpTmpFolder();
    //     let filename = '/upload_file_' + boundary;
    //     //let header = this.makeMultipartHttpHeader(boundary, dataInToken.TokenForComm);
    //     let header = this.makeMultipartHttpHeader(boundary, bearer);
    //     let tmpFile = tempPath + filename;
    //     let npFile = new NPFile(tmpFile, 'wb');
    //     npFile.write('----------------------------' + boundary + '\r\n');
    //     npFile.write('Content-Disposition: form-data; name="file"; filename="' + contentFile + '"\r\n');
    //     npFile.write('Content-Type: application/octet-stream\r\n\r\n');
    //     npFile.writeFrom(contentFile);
    //     npFile.write('\r\n');
    //     npFile.write('----------------------------' + boundary + '--');
    //     npFile.close();
    //     return new Promise<IHttpResponse>((resolve) => {
    //         const new_header = header.replace(/Authorization:Bearer .*/, 'Authorization:Bearer ****');
    //         Logger.Data('UploadMultipartFileAsync url: ' + url + '\nHEADER: ' + new_header + '\nBODY: ' + contentFile);
    //         let ret = SendHttpRequest(result => {
    //             if (/*result.type == "RECEIVING" || */result.type === 'SENDING') {
    //                 if (progress_reporter)
    //                     progress_reporter({ total: result.total??1, done: result.done??1 });
    //                 return;
    //             } else if (result.type === 'RESULT_RSP') {
    //                 Logger.Data('Received UploadMultipartFileAsync url: ' + url + '\nRsp: ' + JSON.stringify(result));
    //                 DeleteFile(tmpFile);
    //                 resolve(result);
    //             } else if (result.type === 'RESULT_ERR') {
    //                 Logger.Error('Received UploadMultipartFileAsync url: ' + url + '\nErr: ' + JSON.stringify(result));
    //                 DeleteFile(tmpFile);
    //                 resolve(result);
    //             }
    //         }, (this.HttpReqID++).toString(), method, url, header, 'FILE:' + tempPath + filename, false, -1);
    //         if(ret)
    //         {
    //             Logger.Error('Received UploadMultipartFileAsync url: ' + url + '\nErr: ' + JSON.stringify(ret));
    //             DeleteFile(tmpFile);
    //             resolve(ret);
    //         }
    //     });
    // }

    GetFileContent(response: IHttpResponse) {
        try {
            //return JSON.parse(LoadFile(response.rsp_data));
            return NPSyncSpec.LoadFile(response.rsp_data || '', 600);
        } catch (e) {
            return 'File does not contain string content';
        }
    }
    async DownloadFileWithTokenAsync(url: string, method: HttpMethod, dataInToken:DataInToken, content: string,
                            progress_reporter?: NetProgressReportNativeFunc, remark = {}): Promise<IHttpResponse> {

        await gAuth.UpdateAccessTokenIfGettingExpiredAsync(dataInToken);
        let reply = await this.DownloadFileAsync(url, method, this.HttpHeader(dataInToken.AcessToken),
            content, progress_reporter, remark);
        if (reply && reply.rsp_data && reply.rsp_code === 403) {
            //dataInToken.AcessToken = await gAuth.RegenerateAccessTokenAsync() ?? dataInToken.AcessToken;
            await gAuth.UpdateAccessTokenIfGettingExpiredAsync(dataInToken, true);
            reply = await this.DownloadFileAsync(url, method, this.HttpHeader(dataInToken.AcessToken),
                content, progress_reporter, remark);
        }
        return reply;
    }
    tmpFileIndex = 0;
    async DownloadFileAsync(url: string, method: HttpMethod, header: string, content: string,
        progress_reporter?: NetProgressReportNativeFunc, remark = {}): Promise<IHttpResponse> {

        let fileName =GetHttpTmpFolder() + '/__http_request' + (this.tmpFileIndex++);
        return new Promise<IHttpResponse>((resolve) => {
            //Logger.Data("DownloadFileAsync url: " + url + "\nHEADER: " + header + "\nBODY: " + content);
            const new_header = header.replace(/Authorization:Bearer .*/, 'Authorization:Bearer ****');
            Logger.Data('DownloadFileAsync url: ' + url + '\nHEADER: ' + new_header + '\nBODY: ' + content);
            NPSyncSpec.SendHttpRequest(
                result => {
                    if (result.type === 'RECEIVING') {
                        if (progress_reporter) {
                            progress_reporter({total: result.total ?? 1, done: result.done ?? 1});
                        }
                    } else  if ( /*|| result.type == "SENDING" ||*/ result.type === 'HEADER_READY') {
                        if (progress_reporter)
                            {progress_reporter({total: result.total ?? 1, done: result.done ?? 1, rsp_header: result.rsp_header});}
                    } else if (result.type === 'RESULT_RSP') {
                        //result.rsp_data_dump = this.GetFileContent(result);
                        //Logger.Data(`\nReceived DownloadFileAsync url: ${url} \nRsp: ${JSON.stringify(result)}\nAdditional Info: ${JSON.stringify(remark)}\n`);
                        Logger.Data(`Received DownloadFileAsync url: ${url}
Rsp: ${JSON.stringify(result)}
rsp_data_dump:${this.GetFileContent(result)}
Additional Info: ${JSON.stringify(remark)}`);
                        resolve(result);
                    } else if (result.type === 'RESULT_ERR') {
                        Logger.Warn(`Received DownloadFileAsync url: ${url}
Err: ${JSON.stringify(result)}
rsp_data_dump:${this.GetFileContent(result)}
Additional Info: ${JSON.stringify(remark)}`);
                        resolve(result);
                    }
                },
                (this.HttpReqID++).toString(), method, url, header, content, fileName, -1);

//             if (error) {
//                 Logger.Warn(`Received DownloadFileAsync url: ${url}
// Err: ${JSON.stringify(error)}
// rsp_data_dump:${this.GetFileContent(error)}
// Additional Info: ${JSON.stringify(remark)}`);
//                 resolve(error);
//             }

        });
    }

    async UploadFileAsync(url: string, header: string, method: HttpMethod, fileName: string,
        progress_reporter?: NetProgressReportNativeFunc): Promise<IHttpResponse> {
        return new Promise<IHttpResponse>((resolve) => {
            const new_header = header.replace(/Authorization:Bearer .*/, 'Authorization:Bearer ****');
            Logger.Data('UploadFileAsync url: ' + url + '\nHEADER: ' + new_header + '\nBODY: ' + fileName);
            NPSyncSpec.SendHttpRequest(result => {
                if (/*result.type == "RECEIVING" || */result.type === 'SENDING') {
                    if (progress_reporter)
                        {progress_reporter({ total: result.total ?? 1, done: result.done ?? 1 });}
                } else if (result.type === 'RESULT_RSP') {
                    Logger.Data('Received UploadFileAsync url: ' + url + '\nRsp: ' + JSON.stringify(result));
                    resolve(result);
                } else if (result.type === 'RESULT_ERR') {
                    Logger.Error('Received UploadFileAsync url: ' + url + '\nErr: ' + JSON.stringify(result));
                    resolve(result);
                }
            }, (this.HttpReqID++).toString(), method, url, header, 'FILE:' + fileName, '', -1);
            // if(ret){
            //     Logger.Error('Received UploadFileAsync url: ' + url + '\nErr: ' + JSON.stringify(ret));
            //     resolve(ret);
            // }
        });
    }

}();
